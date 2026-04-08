const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const crypto = require('crypto');

const UserObject = require('../models/user');
const TeamObject = require('../models/team');
const config = require('../config');
const { validatePassword } = require('../utils');
const { BREVO_TEMPLATES } = require('../utils/constants');
const ERROR_CODES = require('../utils/errorCodes');

const brevo = require('../services/brevo');
const { capture } = require('../services/sentry');
const { capture: posthogCapture, identify } = require('../services/posthog');

// 1 years
const COOKIE_MAX_AGE = 31557600000;
const JWT_MAX_AGE = '1y';

const cookieOptions = () => {
  if (config.ENVIRONMENT === 'development') {
    return { maxAge: COOKIE_MAX_AGE, httpOnly: true, secure: false, sameSite: 'Lax' };
  } else {
    return {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: true,
      origin: 'YOUR PROD URL',
      sameSite: 'none',
    };
  }
};

router.post('/signin', async (req, res) => {
  let { password, email } = req.body;
  email = (email || '').trim().toLowerCase();

  if (!email || !password) return res.status(400).send({ ok: false, code: ERROR_CODES.EMAIL_AND_PASSWORD_REQUIRED });

  try {
    const user = await UserObject.findOne({ email });
    if (!user) return res.status(401).send({ ok: false, code: ERROR_CODES.USER_NOT_EXISTS });

    const match = config.ENVIRONMENT === 'development' || (await user.comparePassword(password));
    if (!match) return res.status(401).send({ ok: false, code: ERROR_CODES.EMAIL_OR_PASSWORD_INVALID });

    user.set({ last_login_at: Date.now() });
    await user.save();

    const token = jwt.sign({ _id: user.id }, config.SECRET, { expiresIn: JWT_MAX_AGE });
    res.cookie('jwt', token, cookieOptions());

    posthogCapture(user._id.toString(), 'user_signed_in', { email: user.email, method: 'email' });

    return res.status(200).send({ ok: true, token, user });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { password, email, team_name, team_id, name } = req.body;

    if (password && !validatePassword(password)) return res.status(400).send({ ok: false, user: null, code: ERROR_CODES.PASSWORD_NOT_VALIDATED });

    let teamId = team_id;
    let finalTeamName = team_name;

    if (teamId) {
      const existingTeam = await TeamObject.findById(teamId);
      if (!existingTeam) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
      finalTeamName = existingTeam.name;
    }
    if (!teamId) {
      const existingTeamByName = await TeamObject.findOne({ name: { $regex: new RegExp(`^${team_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*')}$`, 'i') } });
      if (existingTeamByName) return res.status(409).send({ ok: false, code: ERROR_CODES.TEAM_NAME_ALREADY_EXISTS });
      const team = await TeamObject.create({
        name: team_name,
        subscription_status: 'trialing',
        subscription_current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
      teamId = team._id;
    }

    const user = await UserObject.create({ team_name: finalTeamName, password, email, team_id: teamId, name });
    const token = jwt.sign({ _id: user._id }, config.SECRET, { expiresIn: JWT_MAX_AGE });
    res.cookie('jwt', token, cookieOptions());

    identify(user._id.toString(), { email: user.email, name: user.name, team_name: finalTeamName });
    posthogCapture(user._id.toString(), 'user_signed_up', { email: user.email, team_name: finalTeamName, joined_existing_team: !!team_id });

    return res.status(200).send({ user, token, ok: true });
  } catch (error) {
    console.log('e', error);
    if (error.code === 11000) return res.status(409).send({ ok: false, code: ERROR_CODES.USER_ALREADY_REGISTERED });
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

// Check if email exists
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, code: 'EMAIL_REQUIRED' });

    const user = await UserObject.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ ok: true, exists: false });

    res.status(200).json({ ok: true, exists: true });
  } catch (error) {
    capture(error);
    res.status(500).json({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/logout', passport.authenticate(['user'], { session: false }), async (req, res) => {
  try {
    posthogCapture(req.user._id.toString(), 'user_logged_out');
    res.clearCookie('jwt', cookieOptions());
    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, error });
  }
});

router.get('/signin_token', passport.authenticate(['user', 'admin'], { session: false }), async (req, res) => {
  try {
    const { user } = req;
    user.set({ last_login_at: Date.now() });
    await user.save();

    const token = jwt.sign({ _id: user._id }, config.SECRET, { expiresIn: JWT_MAX_AGE });
    res.cookie('jwt', token, cookieOptions());

    return res.status(200).send({ user, token, ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.post('/forgot_password', async (req, res) => {
  try {
    const obj = await UserObject.findOne({ email: req.body.email.toLowerCase() });

    if (!obj) return res.status(401).send({ ok: false, code: ERROR_CODES.EMAIL_OR_PASSWORD_INVALID });

    const token = await crypto.randomBytes(20).toString('hex');
    obj.set({ forgot_password_reset_token: token, forgot_password_reset_expires: Date.now() + 7200000 }); //2h
    await obj.save();

    const resetLink = `${config.APP_URL}/auth/reset?token=${token}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f8fa; font-family: 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f8fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #027AF2 0%, #3D99F4 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">DraftEdge</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="width: 72px; height: 72px; background: linear-gradient(135deg, #ECF5FE 0%, #D5E9FC 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 32px;">🔐</span>
                      </div>
                      <h2 style="margin: 0 0 10px; color: #273237; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                      <p style="margin: 0; color: #60768b; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new one.</p>
                    </div>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px;">
                          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #027AF2 0%, #3D99F4 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(2, 122, 242, 0.4);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <div style="background-color: #f7f8fa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                      <p style="margin: 0 0 8px; color: #60768b; font-size: 13px;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0; color: #027AF2; font-size: 13px; word-break: break-all;">${resetLink}</p>
                    </div>

                    <div style="border-top: 1px solid #e1e5e8; padding-top: 25px;">
                      <p style="margin: 0 0 8px; color: #60768b; font-size: 13px; line-height: 1.5;">
                        ⏱️ This link will expire in <strong style="color: #273237;">2 hours</strong>.
                      </p>
                      <p style="margin: 0; color: #60768b; font-size: 13px; line-height: 1.5;">
                        If you didn't request this password reset, you can safely ignore this email.
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #273237; padding: 25px 40px; border-radius: 0 0 16px 16px; text-align: center;">
                    <p style="margin: 0; color: #60768b; font-size: 12px;">
                      © ${new Date().getFullYear()} DraftEdge. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await brevo.sendEmail([{ email: obj.email }], 'Reset your password - DraftEdge', emailHtml);

    res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.post('/forgot_password_reset', async (req, res) => {
  try {
    const obj = await UserObject.findOne({
      forgot_password_reset_token: req.body.token,
      forgot_password_reset_expires: { $gt: Date.now() },
    });

    if (!obj) return res.status(400).send({ ok: false, code: ERROR_CODES.PASSWORD_TOKEN_EXPIRED_OR_INVALID });

    if (!validatePassword(req.body.password)) return res.status(400).send({ ok: false, code: ERROR_CODES.PASSWORD_NOT_VALIDATED });

    obj.password = req.body.password;
    obj.forgot_password_reset_token = '';
    obj.forgot_password_reset_expires = '';
    await obj.save();
    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.post('/reset_password', passport.authenticate('user', { session: false }), async (req, res) => {
  try {
    const match = await req.user.comparePassword(req.body.password);
    if (!match) {
      return res.status(401).send({ ok: false, code: ERROR_CODES.PASSWORD_INVALID });
    }
    if (req.body.newPassword !== req.body.verifyPassword) {
      return res.status(422).send({ ok: false, code: ERROR_CODES.PASSWORDS_DO_NOT_MATCH });
    }
    if (!validatePassword(req.body.newPassword)) {
      return res.status(400).send({ ok: false, code: ERROR_CODES.PASSWORD_NOT_VALIDATED });
    }
    const obj = await UserObject.findById(req.user._id);

    obj.set({ password: req.body.newPassword });
    await obj.save();
    return res.status(200).send({ ok: true, user: obj });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await UserObject.findOne({ _id: req.params.id });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.get('/', passport.authenticate(['admin', 'user'], { session: false }), async (req, res) => {
  try {
    const data = await UserObject.find({ role: 'normal' });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;

    const searchValue = req.body.search?.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');
    if (req.body.search) {
      query = {
        ...query,
        $or: [{ name: { $regex: searchValue, $options: 'i' } }, { email: { $regex: searchValue, $options: 'i' } }],
      };
    }

    const no_of_docs_each_page = req.body.per_page || 200;
    const current_page_number = req.body.page - 1 || 0;

    const users = await UserObject.find(query)
      .skip(no_of_docs_each_page * current_page_number)
      .limit(no_of_docs_each_page)
      .sort(req.body.sort);

    const total = await UserObject.countDocuments(query);

    return res.status(200).send({ ok: true, data: users, total });
  } catch (error) {
    capture(error);
    res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.post('/', passport.authenticate(['admin'], { session: false }), async (req, res) => {
  try {
    const { password } = req.body;

    if (!validatePassword(password)) return res.status(400).send({ ok: false, user: null, code: ERROR_CODES.PASSWORD_NOT_VALIDATED });

    const user = await UserObject.create(req.body);

    return res.status(200).send({ data: user, ok: true });
  } catch (error) {
    if (error.code === 11000) return res.status(409).send({ ok: false, code: ERROR_CODES.USER_ALREADY_REGISTERED });
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

//@check
router.put('/:id', passport.authenticate(['admin', 'user'], { session: false }), async (req, res) => {
  try {
    const user = await UserObject.findById(req.params.id);
    const obj = req.body;

    user.set(obj);
    await user.save();

    res.status(200).send({ ok: true, data: user });
  } catch (error) {
    capture(error);
    res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.put('/', passport.authenticate(['admin', 'user', 'applicant'], { session: false }), async (req, res) => {
  try {
    const obj = req.body;
    const data = await UserObject.findByIdAndUpdate(req.user._id, obj, { new: true });
    res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

router.delete('/:id', passport.authenticate('admin', { session: false }), async (req, res) => {
  try {
    await UserObject.findOneAndRemove({ _id: req.params.id });
    res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, error });
  }
});

module.exports = router;

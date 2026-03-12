# API Conventions

## No .lean() or .select()

NEVER use `.lean()` or `.select()` on Mongoose queries. Always return full documents.

```js
// GOOD
const team = await Team.findById(id);

// BAD - never do this
const team = await Team.findById(id).lean();
const team = await Team.findById(id).select("name league");
```

import React, { Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { X } from "lucide-react"

export default function Sheet({ isOpen, onClose, children, title, modal = true }) {
  const dialogClass = "fixed top-16 right-0 bottom-0 left-0 lg:left-64 z-30"

  if (!modal) {
    return (
      <Transition show={isOpen} as={Fragment}>
        <div className={dialogClass}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-400"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-400"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
          </Transition.Child>

          <div className="absolute inset-0 flex flex-col pointer-events-none">
            <div className="flex-1 mt-auto h-full w-full pointer-events-auto">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-400 sm:duration-700"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="transform transition ease-in-out duration-400 sm:duration-700"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
              >
                <div className="w-full relative bg-slate-900 border-t border-slate-700 shadow-xl h-full flex flex-col">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h2 className="text-lg font-medium text-white">{title}</h2>
                    <button type="button" className="rounded-md text-slate-400 hover:text-white focus:outline-none transition-colors" onClick={onClose}>
                      <span className="sr-only">Close panel</span>
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="relative flex-1 px-4 sm:px-6 overflow-y-auto py-6">{children}</div>
                </div>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Transition>
    )
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className={dialogClass} onClose={onClose}>
        <div className="absolute inset-0 overflow-hidden">
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-400"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-400"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-x-0 bottom-0 max-w-full flex h-full">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-400 sm:duration-700"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="transform transition ease-in-out duration-400 sm:duration-700"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <div className="w-full relative bg-slate-900 border-t border-slate-700 shadow-xl h-full flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                  <Dialog.Title className="text-lg font-medium text-white">{title}</Dialog.Title>
                  <button type="button" className="rounded-md text-slate-400 hover:text-white focus:outline-none transition-colors" onClick={onClose}>
                    <span className="sr-only">Close panel</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="relative flex-1 px-4 sm:px-6 overflow-y-auto py-6">{children}</div>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

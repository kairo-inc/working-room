import React, { JSX, PropsWithoutRef, useContext, useEffect, useState } from "react"

import { Notification } from "../components/notification"

const visibleTime = 6_000
const transitionTime = 205

export interface Info {
  title: string
  text: string
  level: "info" | "error" | "warning"
}

export interface InfoState {
  infoList: { [id: string]: Info }
  visibleInfoList: { [id: string]: boolean }
}

/**
 * Divide provider to avoid re-rendering which dependes on "pusher".
 */
const NotificationContext = React.createContext<{ info: InfoState }>({
  info: {
    infoList: {},
    visibleInfoList: {},
  },
})

export const NotifierContext = React.createContext<{ notify: (info: Info) => void }>({
  // Do nothing by default.
  notify: () => undefined,
})

interface Props extends PropsWithoutRef<JSX.IntrinsicElements["div"]> {}

export const NotificationProvider = ({ children }: Props) => {
  const [visibility, setVisibility] = useState<{ [id: string]: boolean }>({})
  const [info, setInfo] = useState<{ [id: string]: Info }>({})

  const notify = (comingInfo: Info) => {
    const newId = new Date().getTime().toString()
    // Controls visibility
    setInfo((prev) => ({ ...prev, [newId]: comingInfo }))
    setVisibility((prev) => ({ ...prev, [newId]: false }))
  }

  useEffect(() => {
    Object.entries(info).map(([k]) => {
      if (!visibility[k]) {
        const newId = k
        setTimeout(() => {
          // 2. Add new info to show it.
          setVisibility((prev) => ({ ...prev, [newId]: true }))
          setTimeout(() => {
            // 3. Hide the component.
            setVisibility((prev) => ({ ...prev, [newId]: false }))
            // 4. Remove the component.
            setTimeout(() => {
              setInfo((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== newId)))
              setVisibility((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== newId)))
            }, transitionTime)
          }, visibleTime)
        }, transitionTime)
      }
    })
  }, [info, visibility])

  return (
    <NotificationContext.Provider value={{ info: { infoList: info, visibleInfoList: visibility } }}>
      <NotifierContext.Provider value={{ notify }}>
        {children}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {Object.entries(info).map(([k, v]) => (
            <Notification
              key={k}
              info={v}
              show={!!visibility[k]}
              onCloseClicked={() => {
                // Hide component if it is clicked.
                setVisibility((prev) => ({ ...prev, [k]: false }))
                setTimeout(() => {
                  setInfo((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== k)))
                  setVisibility((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== k)))
                }, transitionTime)
              }}
            />
          ))}
        </div>
      </NotifierContext.Provider>
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const pusher = useContext(NotifierContext)
  const push = {
    info: (title: string, text: string) => {
      pusher.notify({ title, text, level: "info" })
    },
    error: (title: string, text: string) => {
      pusher.notify({ title, text, level: "error" })
    },
    warn: (title: string, text: string) => {
      pusher.notify({ title, text, level: "warning" })
    },
  }
  return push
}

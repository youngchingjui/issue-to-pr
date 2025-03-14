import { render as rtlRender } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReactElement } from "react"

// Add in any providers here if needed
const Providers = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (ui: ReactElement, options = {}) =>
  rtlRender(ui, {
    wrapper: Providers,
    ...options,
  })

// re-export everything
export * from "@testing-library/react"

// override render method
export { customRender as render, userEvent }

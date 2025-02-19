import Link from "next/link"
import React from "react"

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

const NavigationBar: React.FC<{
  currentPage?: "pullRequests" | "issues"
  username: string
  repo: string
}> = ({ currentPage, username, repo }) => {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <Link href="/" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              <img src="/public/logo.svg" alt="Logo" className="logo-class" />
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href={`/${username}`} legacyBehavior passHref>
            <NavigationMenuLink
              className={`${navigationMenuTriggerStyle()} ${
                currentPage === "issues" ? "active" : ""
              }`}
            >
              {username}
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href={`/${username}/${repo}/issues`} legacyBehavior passHref>
            <NavigationMenuLink
              className={`${navigationMenuTriggerStyle()} ${
                currentPage === "issues" ? "active" : ""
              }`}
            >
              Issues
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link
            href={`/${username}/${repo}/pullRequests`}
            legacyBehavior
            passHref
          >
            <NavigationMenuLink
              className={`${navigationMenuTriggerStyle()} ${
                currentPage === "pullRequests" ? "active" : ""
              }`}
            >
              Pull Requests
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem style={{ marginLeft: 'auto' }}>
          <button className="sign-out-button">Sign Out</button>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export default NavigationBar

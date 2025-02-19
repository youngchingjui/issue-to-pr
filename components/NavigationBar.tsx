import Image from "next/image"
import Link from "next/link"
import React from "react"

import SignOutButton from "@/components/SignOutButton"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { getGithubUser } from "@/lib/github/users"

const NavigationBar: React.FC<{
  currentPage?: "pullRequests" | "issues"
  repo?: string
}> = async ({ currentPage, repo }) => {
  const user = await getGithubUser()
  const username = user.login

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <Link href="/" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              <Image
                src="/public/logo.svg"
                alt="Logo"
                className="logo-class"
                width={100}
                height={100}
              />
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
        {repo && (
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
        )}
        {repo && (
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
        )}
        <NavigationMenuItem>
          <SignOutButton />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export default NavigationBar

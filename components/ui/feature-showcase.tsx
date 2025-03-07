"use client"

import Image from "next/image"
import React from "react"
import TextMd from "./text-md"
import TextSm from "./text-sm"
import { motion } from "framer-motion"

const ImageCard = ({ image }: { image: string }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg h-full w-full col-span-1 sm:col-span-2 md:col-span-1 group">
      <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent z-10 transition-opacity duration-300 group-hover:opacity-0" />
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="h-full w-full"
      >
        <Image
          src={image}
          alt="feature"
          width={1080}
          height={1080}
          className="h-full w-full object-cover"
          priority
        />
      </motion.div>
    </div>
  )
}

const Title = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{
        opacity: 1,
        x: 0,
        transition: {
          duration: 0.5,
          delay: 0.3,
        },
      }}
      viewport={{ once: true }}
    >
      <TextMd>{children}</TextMd>
    </motion.div>
  )
}

const Description = ({ children }: { children: React.ReactNode }) => {
  return <TextSm className="text-black/70">{children}</TextSm>
}

const Content = ({
  item,
}: {
  item: { title: string; description: string }
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{
        opacity: 1,
        x: 0,
        transition: {
          duration: 0.5,
          delay: 0.3,
        },
      }}
      viewport={{ once: true }}
    >
      <Title>{item.title}</Title>
      <Description>{item.description}</Description>
    </motion.div>
  )
}

const FeatureShowcase = ({
  items,
}: {
  items: { image: string; title: string; description: string }[]
}) => {
  return (
    <div className="flex flex-col max-w-6xl w-full gap-12 px-5 lg:px-10">
      {items.map((item, i) => {
        return (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.6,
                ease: "easeOut",
                delay: 0.2,
              },
            }}
            viewport={{ once: true }}
            key={`feature-item-${i}`}
            className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-3 gap-4 md:gap-0 lg:gap-5 sm:hover:gap-[16px] transition-all duration-300 w-full bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm p-1 overflow-hidden"
          >
            {i % 2 === 0 ? (
              <>
                <ImageCard image={item.image} />
                <div className="col-span-2 md:pl-5 lg:pl-10 h-full w-full flex flex-col gap-6 md:py-8 justify-center">
                  <Content item={item} />
                </div>
              </>
            ) : (
              <>
                <div className="hidden md:block col-span-1 w-full h-full" />
                <ImageCard image={item.image} />
                <div className="col-span-2 md:col-span-1 md:pl-5 lg:pl-10 h-full w-full flex flex-col gap-6 md:py-8 justify-center">
                  <Content item={item} />
                </div>
              </>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export default FeatureShowcase

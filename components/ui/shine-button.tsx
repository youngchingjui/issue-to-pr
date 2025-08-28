"use client"

import { type HTMLMotionProps, motion } from "framer-motion"

type ShineButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: React.ReactNode
}

const ShineButton: React.FC<ShineButtonProps> = ({
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <motion.button
      {...props}
      disabled={disabled}
      className={`relative overflow-hidden rounded-lg border border-neutral-700 px-6 py-3 text-white font-semibold transition-all duration-300 hover:border-neutral-400 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] active:scale-95 isolate ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      whileHover={disabled ? undefined : { scale: 1.02 }}
    >
      <motion.span
        className="absolute -left-full top-0 h-full w-[150%] blur-[6px] opacity-40 -z-10"
        initial={{ x: "-150%" }}
        animate={{ x: "150%" }}
        whileHover={disabled ? undefined : { opacity: 0.6 }}
        style={{
          background:
            "linear-gradient(-55deg, transparent 40%, #ffffffbb 50%, transparent 60%)",
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  )
}

export default ShineButton

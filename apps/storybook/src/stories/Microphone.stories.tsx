import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import VoiceDictationButton from "@/components/common/VoiceDictationButton"

const meta: Meta<typeof VoiceDictationButton> = {
  title: "App/VoiceDictationButton",
  component: VoiceDictationButton,
  parameters: {
    layout: "padded",
  },
}

export default meta

type Story = StoryObj<typeof VoiceDictationButton>

export const Default: Story = {
  args: {
    onTranscribed: (text: string) => console.log("Transcribed:", text),
  },
  render: (args) => <VoiceDictationButton {...args} />,
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => <VoiceDictationButton {...args} />,
}


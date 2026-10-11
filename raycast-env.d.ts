/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask` command */
  export type Ask = ExtensionPreferences & {
  /** claude Binary - Output of `which claude`. */
  "claudePath": string,
  /** Default Model - Used when no model is picked in the command arguments. */
  "defaultModel": "haiku" | "sonnet" | "opus",
  /** OAuth Token (Optional) - Only needed if claude reports it is not logged in when run from Raycast. Generate with `claude setup-token`. */
  "oauthToken"?: string,
  /** System Prompt - Instructions that keep answers short. */
  "systemPrompt": string
}
}

declare namespace Arguments {
  /** Arguments passed to the `ask` command */
  export type Ask = {
  /** Question */
  "question": string,
  /** Model */
  "model": "haiku" | "sonnet" | "opus"
}
}


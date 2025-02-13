import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"
// using defaultConfig here is important to get the default style, not just defaultBaseConfig
const customConfig = defineConfig({
    theme: {},
  })
  
export const system = createSystem(defaultConfig, customConfig)
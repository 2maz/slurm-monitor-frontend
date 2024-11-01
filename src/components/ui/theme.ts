import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"
// using defaultConfig here is important to get the default style, not just defaultBaseConfig
const customConfig = defineConfig({
    theme: {
      colors: {
        brand: {
          500: "tomato",
        },
      },
    },
  })
  
export const system = createSystem(defaultConfig, customConfig)
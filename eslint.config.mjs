import next from "eslint-config-next"

const config = [
  { ignores: [".next/**", "node_modules/**"] },
  ...next,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
]

export default config

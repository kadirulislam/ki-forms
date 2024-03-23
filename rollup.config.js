// rollup.config.js

import typescript from '@rollup/plugin-typescript';

export default {

    input: "src/index.ts",
    output: {
        dir: "dist",
        format: "es",
        name: "ki-forms"
    },
    external: ["react", "react-dom"],
    plugins: [typescript({ tsconfig: "tsconfig.json" })],

};
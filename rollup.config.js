// rollup.config.js

import typescript from '@rollup/plugin-typescript';
import postcss from "rollup-plugin-postcss";

export default {

    input: "src/index.ts",

    output: {
        dir: "dist",
        format: 'esm',
        name: "ki-forms"
    },
    external: ["react", "react-dom"],
    plugins: [
        typescript({ tsconfig: "tsconfig.json" }),
        postcss({
            config: {
                path: "./postcss.config.cjs",
            },
            extensions: [".css"],
            minimize: true,
            inject: {
                insertAt: "top",
            },
        }),
    ],

};
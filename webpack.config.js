const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require('webpack')

module.exports = {
    mode: "development",
    entry: "./src/main/ts/app.tsx",
    output: {
        path: path.join(__dirname, "build/assets"),
        filename: "bundle.[contenthash].js",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".scss"],
        modules: ["node_modules"],
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: "ts-loader" },
            {
                test: /\.(sa|sc|c)ss$/i,
                use: [
                    "style-loader",
                    "css-loader",
                    "sass-loader",
                ],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                type: "asset/resource",
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            path: path.join(__dirname, "build/assets"),
            filename: "index.html",
            template: "./src/main/html/index.html",
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
    devServer: {
        static: {
            directory: "./build/assets",
        },
        historyApiFallback: true,
        compress: true,
        port: 8080,
    },
};

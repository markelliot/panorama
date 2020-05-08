const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");

module.exports = {
    mode: "development",
    entry: "./src/main/ts/app.tsx",
    output: {
        path: path.join(__dirname, "build/assets"),
        filename: "bundle.js",
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
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: { publicPath: "../" },
                    },
                    // "style-loader",
                    "css-loader",
                    "sass-loader",
                ],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                use: ["file-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            path: path.join(__dirname, "build/assets"),
            filename: "index.html",
            template: "./src/main/html/index.html",
        }),
        new MiniCssExtractPlugin({
            filename: "[name].css",
        }),
    ],
    devServer: {
        contentBase: "./build/assets",
        compress: true,
        port: 8080,
    },
};

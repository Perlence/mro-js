module.exports = {
  mode: 'development',
  devtool: 'eval',
  watch: true,
  entry: {
    test: './test.js'
  },
  devServer: {
    contentBase: '.',
    openPage: 'test.html'
  },
  output: {
    path: process.cwd(),
    filename: 'test.bundle.js'
  }
};

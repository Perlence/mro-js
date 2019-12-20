module.exports = {
  mode: 'development',
  devtool: 'eval',
  watch: true,
  entry: {
    test: './test.js'
  },
  output: {
    path: process.cwd(),
    filename: 'test.bundle.js'
  }
};

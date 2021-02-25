module.exports = function () {
  console.log('Environment variables ready');
  return { ...process.env };
};

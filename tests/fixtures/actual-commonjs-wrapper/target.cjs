function target() {
  return "actual-default";
}

target.named = () => "actual-named";

module.exports = target;

import Text from "src/components/common/Text/Text";

export default function LoadingSpinner({
  label,
}: {
  label?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return <Text>{label}</Text>;
}

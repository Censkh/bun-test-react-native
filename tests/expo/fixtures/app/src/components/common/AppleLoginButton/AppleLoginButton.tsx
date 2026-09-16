import Button from "src/components/common/Button/Button";

export default function AppleLoginButton(props: any) {
  return <Button label="apple" onPress={() => props.onSuccess?.({})} />;
}

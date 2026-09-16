import Button from "src/components/common/Button/Button";

export default function GoogleLoginButton(props: any) {
  return <Button label="google" onPress={() => props.onSuccess?.({})} />;
}

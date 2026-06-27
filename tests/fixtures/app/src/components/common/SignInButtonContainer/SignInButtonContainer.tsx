import type { PropsWithChildren } from "react";

export default function SignInButtonContainer({
  children,
}: PropsWithChildren<{ showLastUsed?: boolean }>) {
  return <>{children}</>;
}

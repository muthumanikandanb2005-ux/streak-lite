declare module "expo-status-bar" {
  export type StatusBarStyle = "light" | "dark" | "auto";

  export type StatusBarProps = {
    animated?: boolean;
    backgroundColor?: string;
    barStyle?: StatusBarStyle;
    hidden?: boolean;
    networkActivityIndicatorVisible?: boolean;
    showHideTransition?: "fade" | "slide";
    style?: StatusBarStyle;
    translucent?: boolean;
  };

  const StatusBar: (props: StatusBarProps) => null;
  export { StatusBar };
}

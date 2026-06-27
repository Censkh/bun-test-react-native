import { describe, expect, test } from "bun:test";
import * as Compose from "@expo/ui/jetpack-compose";
import * as ComposeModifiers from "@expo/ui/jetpack-compose/modifiers";
import * as Swift from "@expo/ui/swift-ui";
import * as SwiftModifiers from "@expo/ui/swift-ui/modifiers";
import { render } from "@testing-library/react-native";
import type React from "react";

const noop = () => {};

const child = (label: string) => <Swift.Text>{label}</Swift.Text>;
const composeChild = (label: string) => <Compose.Text>{label}</Compose.Text>;

const renderInsideSwiftHost = (children: React.ReactNode) =>
  render(
    <Swift.Host matchContents>
      <Swift.VStack modifiers={[SwiftModifiers.padding({ all: 4 })]}>{children}</Swift.VStack>
    </Swift.Host>,
  );

const renderInsideComposeHost = (children: React.ReactNode) =>
  render(
    <Compose.Host>
      <Compose.Column modifiers={[ComposeModifiers.paddingAll(4)]}>{children}</Compose.Column>
    </Compose.Host>,
  );

const SwiftStateProbe = ({ onValue }: { onValue: (value: string) => void }) => {
  const nativeState = Swift.useNativeState("native");
  onValue(nativeState.getValue());
  return <Swift.Text>Swift state</Swift.Text>;
};

const ComposeStateProbe = ({ onValue }: { onValue: (value: string) => void }) => {
  const nativeState = Compose.useNativeState("compose");
  onValue(nativeState.getValue());
  return <Compose.Text>Compose state</Compose.Text>;
};

type JsonNode =
  | {
      children?: JsonNode[] | null;
      props?: Record<string, unknown>;
      type?: string;
    }
  | string
  | null;

const findJsonNodeByType = (
  node: JsonNode | JsonNode[],
  type: string,
): Exclude<JsonNode, string | null> | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findJsonNodeByType(child, type);
      if (match) return match;
    }
    return null;
  }
  if (!node || typeof node === "string") return null;
  if (node.type === type) return node;
  return findJsonNodeByType(node.children ?? [], type);
};

const findImageJsonNode = (node: JsonNode | JsonNode[]) =>
  findJsonNodeByType(node, "ImageView") ??
  findJsonNodeByType(node, "ViewManagerAdapter_ExpoUI_ImageView");

describe("@expo/ui native module mocks", () => {
  test("exposes text rendered inside SwiftUI native view mocks to queries", async () => {
    const result = await renderInsideSwiftHost(
      <>
        <Swift.Button label="Swift button label" onPress={noop} />
        <Swift.Text>Swift text child</Swift.Text>
        <Swift.ContentUnavailableView
          title="Swift empty title"
          description="Swift empty description"
        />
      </>,
    );

    expect(result.getByText("Swift button label")).toBeTruthy();
    expect(result.getByText("Swift text child")).toBeTruthy();
    expect(result.getByText("Swift empty title")).toBeTruthy();
    expect(result.getByText("Swift empty description")).toBeTruthy();
  });

  test("exposes text rendered inside Jetpack Compose native view mocks to queries", async () => {
    const result = await renderInsideComposeHost(
      <>
        <Compose.Button onClick={noop}>{composeChild("Compose button child")}</Compose.Button>
        <Compose.Text>Compose text child</Compose.Text>
        <Compose.ListItem headlineContent={composeChild("Compose list headline")} />
      </>,
    );

    expect(result.getByText("Compose button child")).toBeTruthy();
    expect(result.getByText("Compose text child")).toBeTruthy();
    expect(result.getByText("Compose list headline")).toBeTruthy();
  });

  test("renders Swift Image props and generated modifiers", async () => {
    const result = await render(
      <Swift.Image
        color="#123456"
        modifiers={[
          SwiftModifiers.aspectRatio({ ratio: 1 }),
          SwiftModifiers.frame({ height: 20, width: 20 }),
        ]}
        size={22}
        systemName="square.and.arrow.up"
      />,
    );

    const image = findImageJsonNode(result.toJSON());
    expect(image).toBeDefined();
    expect(image?.props?.systemName).toBe("square.and.arrow.up");
    expect(image?.props?.modifiers).toContainEqual(
      expect.objectContaining({ $type: "font", size: 22 }),
    );
    expect(image?.props?.modifiers).toContainEqual(
      expect.objectContaining({
        $type: "foregroundStyle",
        color: "#123456",
        styleType: "color",
      }),
    );
    expect(image?.props?.modifiers).toContainEqual(
      expect.objectContaining({
        $type: "frame",
        height: 20,
        width: 20,
      }),
    );
  });

  test("render many SwiftUI components", () => {
    const tree = renderInsideSwiftHost(
      <>
        <SwiftStateProbe onValue={noop} />
        <Swift.AccessoryWidgetBackground />
        <Swift.Button label="Button" onPress={noop} />
        <Swift.ColorPicker selection="#ff0000" onValueChanged={noop} />
        <Swift.ContentUnavailableView title="Empty" description="Nothing here" />
        <Swift.ControlGroup>{child("Control")}</Swift.ControlGroup>
        <Swift.DatePicker title="Date" selection={new Date("2026-01-01T00:00:00.000Z")} />
        <Swift.DisclosureGroup title="Disclosure">{child("Details")}</Swift.DisclosureGroup>
        <Swift.Divider />
        <Swift.Form>{child("Form")}</Swift.Form>
        <Swift.Gauge value={0.5} />
        <Swift.GlassEffectContainer>{child("Glass")}</Swift.GlassEffectContainer>
        <Swift.Grid>
          <Swift.Grid.Row>{child("Grid")}</Swift.Grid.Row>
        </Swift.Grid>
        <Swift.Group>{child("Group")}</Swift.Group>
        <Swift.HStack>{child("HStack")}</Swift.HStack>
        <Swift.Image systemName="star" />
        <Swift.Label title="Label" systemImage="star" />
        <Swift.LabeledContent label="Label">{child("Content")}</Swift.LabeledContent>
        <Swift.LazyHStack>{child("LazyH")}</Swift.LazyHStack>
        <Swift.LazyVStack>{child("LazyV")}</Swift.LazyVStack>
        <Swift.Link href="https://example.com">{child("Link")}</Swift.Link>
        <Swift.List selection={["one"]}>{child("List")}</Swift.List>
        <Swift.Menu label="Menu">{child("Menu item")}</Swift.Menu>
        <Swift.Namespace id="namespace">{child("Namespace")}</Swift.Namespace>
        <Swift.Overlay overlay={child("Overlay")}>{child("Base")}</Swift.Overlay>
        <Swift.Picker label="Picker" selection="one">
          <Swift.Text modifiers={[SwiftModifiers.tag("one")]}>One</Swift.Text>
        </Swift.Picker>
        <Swift.Popover isPresented>{child("Popover")}</Swift.Popover>
        <Swift.ProgressView progress={0.25} />
        <Swift.Rectangle />
        <Swift.RoundedRectangle cornerRadius={8} />
        <Swift.ScrollView>{child("Scroll")}</Swift.ScrollView>
        <Swift.Section header={child("Header")} footer={child("Footer")}>
          {child("Section")}
        </Swift.Section>
        <Swift.SecureField text="secret" onTextChange={noop} />
        <Swift.ShareLink item="https://example.com" />
        <Swift.Slider value={0.5} min={0} max={1} />
        <Swift.Spacer />
        <Swift.Stepper value={1} onValueChange={noop} />
        <Swift.SwipeActions>
          <Swift.SwipeActions.Actions>{child("Swipe")}</Swift.SwipeActions.Actions>
        </Swift.SwipeActions>
        <Swift.SyncToggle isOn={false} label="Sync" />
        <Swift.TabView selection="one">
          <Swift.TabView.Tab title="One" value="one">
            {child("Tab")}
          </Swift.TabView.Tab>
        </Swift.TabView>
        <Swift.TextField text="Text field" onTextChange={noop} />
        <Swift.Toggle isOn label="Toggle" onIsOnChange={noop} />
        <Swift.ZStack>{child("ZStack")}</Swift.ZStack>
      </>,
    );

    expect(tree).toBeTruthy();
  });

  test("render many Jetpack Compose components", () => {
    const tree = renderInsideComposeHost(
      <>
        <ComposeStateProbe onValue={noop} />
        <Compose.AlertDialog visible title="Alert">
          {composeChild("Alert content")}
        </Compose.AlertDialog>
        <Compose.Badge>{composeChild("1")}</Compose.Badge>
        <Compose.BadgedBox badge={<Compose.Badge>{composeChild("2")}</Compose.Badge>}>
          {composeChild("Badged")}
        </Compose.BadgedBox>
        <Compose.BasicAlertDialog visible>{composeChild("Basic alert")}</Compose.BasicAlertDialog>
        <Compose.Box>{composeChild("Box")}</Compose.Box>
        <Compose.Button onClick={noop}>{composeChild("Button")}</Compose.Button>
        <Compose.Card>{composeChild("Card")}</Compose.Card>
        <Compose.Checkbox value onCheckedChange={noop} />
        <Compose.AssistChip onClick={noop}>{composeChild("Chip")}</Compose.AssistChip>
        <Compose.CircularProgressIndicator progress={0.5} />
        <Compose.HorizontalDivider />
        <Compose.DropdownMenu expanded>{composeChild("Menu")}</Compose.DropdownMenu>
        <Compose.ElevatedButton onClick={noop}>{composeChild("Elevated")}</Compose.ElevatedButton>
        <Compose.FilledTonalButton onClick={noop}>
          {composeChild("Tonal")}
        </Compose.FilledTonalButton>
        <Compose.FloatingActionButton onClick={noop}>
          {composeChild("Fab")}
        </Compose.FloatingActionButton>
        <Compose.FlowRow>{composeChild("Flow")}</Compose.FlowRow>
        <Compose.HorizontalFloatingToolbar>
          {composeChild("Toolbar")}
        </Compose.HorizontalFloatingToolbar>
        <Compose.Icon name="star" />
        <Compose.IconButton onClick={noop}>{composeChild("Icon button")}</Compose.IconButton>
        <Compose.LazyColumn>{composeChild("Lazy column")}</Compose.LazyColumn>
        <Compose.LazyRow>{composeChild("Lazy row")}</Compose.LazyRow>
        <Compose.LinearProgressIndicator progress={0.5} />
        <Compose.ListItem headlineContent={composeChild("List item")} />
        <Compose.LoadingIndicator />
        <Compose.ModalBottomSheet visible>{composeChild("Sheet")}</Compose.ModalBottomSheet>
        <Compose.NavigationBar>{composeChild("Nav")}</Compose.NavigationBar>
        <Compose.OutlinedButton onClick={noop}>{composeChild("Outlined")}</Compose.OutlinedButton>
        <Compose.OutlinedTextField value="Outlined" onValueChange={noop} />
        <Compose.RadioButton selected onClick={noop} />
        <Compose.Row>{composeChild("Row")}</Compose.Row>
        <Compose.SearchBar inputField={composeChild("Search")}>
          {composeChild("Results")}
        </Compose.SearchBar>
        <Compose.SingleChoiceSegmentedButtonRow>
          {composeChild("Segment")}
        </Compose.SingleChoiceSegmentedButtonRow>
        <Compose.Slider value={0.5} onValueChange={noop} />
        <Compose.Snackbar>{composeChild("Snackbar")}</Compose.Snackbar>
        <Compose.Spacer />
        <Compose.Surface>{composeChild("Surface")}</Compose.Surface>
        <Compose.Switch value onCheckedChange={noop} />
        <Compose.TextButton onClick={noop}>{composeChild("Text button")}</Compose.TextButton>
        <Compose.TextField value="Text" onValueChange={noop} />
        <Compose.ToggleButton checked onCheckedChange={noop}>
          {composeChild("Toggle")}
        </Compose.ToggleButton>
        <Compose.TooltipBox>
          <Compose.TooltipBox.PlainTooltip>
            {composeChild("Tooltip")}
          </Compose.TooltipBox.PlainTooltip>
          {composeChild("Anchor")}
        </Compose.TooltipBox>
      </>,
    );

    expect(tree).toBeTruthy();
  });
});

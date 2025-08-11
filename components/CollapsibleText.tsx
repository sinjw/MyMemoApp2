import { PropsWithChildren, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export function CollapsibleText({
  children,
  title,
}: PropsWithChildren<{ title: string }>) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? "light";

  return (
    <ThemedView style={styles.container}>
      {isOpen ? (
        <View>
          <ThemedText style={{ color: Colors.dark.text }}>
            {children}
          </ThemedText>
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            style={styles.button}
          >
            <ThemedText
              style={[styles.toggleButtonText, { color: Colors[theme].tint }]}
            >
              ▼
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setIsOpen(true)} style={styles.button}>
          <ThemedText
            style={[styles.toggleButtonText, { color: Colors[theme].tint }]}
          >
            {title}
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#815854",
    borderStyle: "solid",
    alignSelf: "center",
    marginTop: 10,
  },
  toggleButtonText: {
    fontSize: 25,
    fontWeight: "bold",
  },
});

import { Stack } from "expo-router";
import { View, StyleSheet } from 'react-native'; // Import View and StyleSheet

export default function RootLayout() {
  return (
    <View style={styles.rootContainer}> {/* New View wrapper */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="calendar" /> {/* Add calendar screen to stack for explicit registration */}
        <Stack.Screen name="memo/[id]" /> {/* Add memo detail screen */}
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F9EBDE', // Set desired background color here
  },
});
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Memo {
  id: string;
  title: string;
  content: string;
  category: string;
  images?: { uri: string; tag: string }[]; // 이미지 배열 추가
  timestamp: number;
  isLiked?: boolean; // New property for liking/pinning
}

export default function MemoListScreen() {
  const router = useRouter();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMemoIds, setSelectedMemoIds] = useState<string[]>([]); // 선택된 메모 ID
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // 다중 선택 모드 여부
  const [showSearchInput, setShowSearchInput] = useState(false); // New state for search input visibility
  const [showMenuModal, setShowMenuModal] = useState(false); // New state for menu modal visibility

  const loadMemos = async () => {
    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      if (storedMemos) {
        const parsedMemos: Memo[] = JSON.parse(storedMemos);
        // Sort memos by liked status then by timestamp in descending order
        const sortedMemos = parsedMemos.sort((a, b) => {
          // Prioritize liked memos
          if (a.isLiked && !b.isLiked) {
            return -1; // a comes before b
          }
          if (!a.isLiked && b.isLiked) {
            return 1; // b comes before a
          }
          // If both are liked or both are not liked, sort by timestamp
          return b.timestamp - a.timestamp;
        });
        setMemos(sortedMemos);
      }
    } catch (error) {
      console.error("Failed to load memos:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMemos();
      setSelectedMemoIds([]); // 화면 포커스 시 선택 초기화
      setIsMultiSelectMode(false); // 화면 포커스 시 다중 선택 모드 해제
    }, [])
  );

  const allCategories = [
    "All",
    ...Array.from(new Set(memos.map((memo) => memo.category))).filter(Boolean),
  ];

  const filteredMemos = memos.filter((memo) => {
    const matchesSearch =
      memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || memo.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleSelectMemo = (id: string) => {
    if (selectedMemoIds.includes(id)) {
      setSelectedMemoIds(selectedMemoIds.filter((memoId) => memoId !== id));
    } else {
      setSelectedMemoIds([...selectedMemoIds, id]);
    }
  };

  const handleLongPressMemo = (id: string) => {
    setIsMultiSelectMode(true);
    toggleSelectMemo(id);
  };

  const handleDeleteSelectedMemos = async () => {
    Alert.alert(
      "메모 삭제",
      `선택된 메모 ${selectedMemoIds.length}개를 삭제하시겠습니까?`,
      [
        { text: "아니오", style: "cancel" },
        {
          text: "예",
          onPress: async () => {
            try {
              const storedMemos = await AsyncStorage.getItem("memos");
              const memos: Memo[] = storedMemos ? JSON.parse(storedMemos) : [];
              const remainingMemos = memos.filter(
                (memo) => !selectedMemoIds.includes(memo.id)
              );
              await AsyncStorage.setItem(
                "memos",
                JSON.stringify(remainingMemos)
              );
              Alert.alert("성공", "선택된 메모가 삭제되었습니다.");
              loadMemos(); // 메모 목록 새로고침
              setSelectedMemoIds([]);
              setIsMultiSelectMode(false);
            } catch (error) {
              console.error("Failed to delete memos:", error);
              Alert.alert("오류", "메모 삭제에 실패했습니다.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleLike = async (id: string) => {
    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      const memos: Memo[] = storedMemos ? JSON.parse(storedMemos) : [];
      const updatedMemos = memos.map((memo) =>
        memo.id === id ? { ...memo, isLiked: !memo.isLiked } : memo
      );
      await AsyncStorage.setItem("memos", JSON.stringify(updatedMemos));
      loadMemos(); // Reload memos to reflect sorting
    } catch (error) {
      console.error("Failed to toggle like status:", error);
      Alert.alert("오류", "좋아요 상태 변경에 실패했습니다.");
    }
  };

  const renderItem = ({ item }: { item: Memo }) => (
    <TouchableOpacity
      style={[
        styles.memoItem,
        isMultiSelectMode &&
          selectedMemoIds.includes(item.id) &&
          styles.selectedMemoItem,
      ]}
      onPress={() =>
        isMultiSelectMode
          ? toggleSelectMemo(item.id)
          : router.push({
              pathname: "/memo/[id]",
              params: {
                id: item.id,
                title: item.title,
                content: item.content,
                category: item.category,
                timestamp: item.timestamp.toString(), // timestamp는 숫자로 저장되므로 문자열로 변환
              },
            })
      }
      onLongPress={() => handleLongPressMemo(item.id)}
    >
      {isMultiSelectMode && (
        <View style={styles.checkboxContainer}>
          <View
            style={[
              styles.checkbox,
              selectedMemoIds.includes(item.id) && styles.checkedCheckbox,
            ]}
          />
        </View>
      )}
      <View style={styles.memoContentContainer}>
        <Text style={styles.memoTitle}>{item.title || "제목 없음"}</Text>
        {item.category ? (
          <Text style={styles.memoCategory}>{item.category}</Text>
        ) : null}
        <Text style={styles.memoContent} numberOfLines={1}>
          {item.content}
        </Text>
        <Text style={styles.memoDate}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => toggleLike(item.id)} // New handler
      >
        <Text style={styles.likeButtonText}>{item.isLiked ? "♥" : "♡"}</Text>{" "}
        {/* Star icon */}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fixedHeaderContainer}>
        <View style={styles.headerTopRow}>
          <Image
            source={require("@/assets/images/MyMemoLogo.png")}
            style={styles.myMemoLogoImage}
          />
          <Text style={styles.headerTitle}>for Heagun ver.</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenuModal(true)}
          >
            <Image
              source={require("@/assets/images/MenuButton.png")}
              style={styles.menuButtonImage}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerSearchRow}>
          {showSearchInput && (
            <TextInput
              style={styles.searchInput}
              placeholder="메모 검색..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          )}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearchInput(!showSearchInput)}
          >
            <Image
              source={require("@/assets/images/SearchButton.png")}
              style={styles.searchButtonImage}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollContainer}
        >
          {allCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategoryButton,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category &&
                    styles.selectedCategoryButtonText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filteredMemos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 메모가 없습니다.</Text>
            <Text style={styles.emptyText}>
              하단의 버튼을 눌러 메모를 추가해보세요!
            </Text>
          </View>
        }
        style={styles.memoList}
        showsVerticalScrollIndicator={false} // Added
      />
      {isMultiSelectMode ? (
        <View style={styles.multiSelectButtonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteSelectedMemos}
          >
            <Text style={styles.deleteButtonText}>
              삭제 ({selectedMemoIds.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelMultiSelectButton}
            onPress={() => {
              setSelectedMemoIds([]);
              setIsMultiSelectMode(false);
            }}
          >
            <Text style={styles.cancelMultiSelectButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Link href="/create" asChild>
          <TouchableOpacity style={styles.addButton}>
            <Image
              source={require("@/assets/images/MemoButton.png")}
              style={styles.addButtonImage}
            />
          </TouchableOpacity>
        </Link>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={showMenuModal}
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/calendar");
              }}
            >
              <Text style={styles.modalButtonText}>Go to Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMenuModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5ED",
    paddingTop: 70,
  },
  fixedHeaderContainer: {
    backgroundColor: "#FFF5ED",
    paddingBottom: 10,
    flexDirection: "column",
    paddingHorizontal: 15,
  },
  memoList: {
    flex: 1,
    backgroundColor: "#FFF5ED",
  },
  searchButton: {
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5, // Increased
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Increased height for more visible shadow
    shadowOpacity: 0.3, // Increased
    shadowRadius: 5, // Increased
  },
  searchButtonImage: {
    width: 24, // Adjust as needed
    height: 24, // Adjust as needed
    resizeMode: "contain",
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 0, // Adjusted
    marginBottom: 10,
    borderRadius: 10,
    fontSize: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flex: 1, // Added
    marginRight: 10, // Added for spacing between input and button
  },
  memoCategory: {
    fontSize: 12,
    color: "#815854", // Changed
    marginBottom: 5,
    fontWeight: "bold",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    // textAlign: "center",
    marginVertical: 20,
    color: "#333",
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#815854",
    flex: 1, // To take up available space between logo and menu button
    textAlign: "center", // Center the text
  },
  menuButton: {
    padding: 10,
  },
  menuButtonImage: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  calendarButton: {
    padding: 10,
  },
  calendarButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#815854", // Consistent with other text
  },
  myMemoLogoImage: {
    width: 200, // Changed
    height: 70, // Changed
    resizeMode: "contain",
    marginRight: 10, // Add some spacing
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10, // Add some spacing
  },
  headerSearchRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10, // Add some spacing
  },
  memoItem: {
    backgroundColor: "#fff", // Changed
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2, // Changed
    borderColor: "#815854", // Added
    borderStyle: "dashed", // Changed
  },
  memoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#444",
  },
  memoContent: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  memoDate: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
  },
  categoryScrollContainer: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  categoryButton: {
    backgroundColor: "white", // Changed
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1, // Added
    borderColor: "#815854", // Added
  },
  selectedCategoryButton: {
    backgroundColor: "#815854", // Changed
  },
  categoryButtonText: {
    color: "#815854", // Changed
    fontSize: 14,
    fontWeight: "bold",
  },
  selectedCategoryButtonText: {
    color: "#fff", // Changed
  },
  addButton: {
    position: "absolute",
    bottom: 130,
    right: 30,
    backgroundColor: "#F5F5DC", // Beige color
    width: 60,
    height: 60,
    borderRadius: 15, // 15px radius
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000", // Shadow color
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 30,
  },
  addButtonImage: {
    width: 40, // Adjust as needed
    height: 40, // Adjust as needed
    resizeMode: "contain",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 10,
  },
  selectedMemoItem: {
    backgroundColor: "#e6f7ff", // 선택된 메모 배경색
    borderColor: "#007AFF", // 선택된 메모 테두리색
    borderWidth: 1,
  },
  checkbox: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxContainer: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: [{ translateY: -10 }],
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#888",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkedCheckbox: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  memoContentContainer: {
    marginLeft: 30, // 체크박스 공간 확보
    flex: 1,
    marginRight: 40, // Added to make space for like button
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#dc3545",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center", // Added
  },
  multiSelectButtonContainer: {
    position: "absolute",
    bottom: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cancelMultiSelectButton: {
    backgroundColor: "#6c757d",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#6c757d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginLeft: 10,
  },
  cancelMultiSelectButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", // Semi-transparent overlay
  },
  modalView: {
    margin: 20,
    backgroundColor: "#F5F5DC", // Memo add button background color
    borderRadius: 20,
    borderWidth: 2, // Border width
    borderColor: "#815854", // Memo list item border color
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalButton: {
    backgroundColor: "#815854", // Consistent with other buttons
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginBottom: 10,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalCloseButton: {
    backgroundColor: "#6c757d", // A neutral color for close
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  modalCloseButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  likeButton: {
    position: "absolute",
    top: 8,
    right: 10,
    padding: 0,
  },
  likeButtonText: {
    fontSize: 30,
    color: "#A4193D", // Gold color for liked star
  },
});

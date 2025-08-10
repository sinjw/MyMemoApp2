import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
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
  images?: { uri: string; tag: string; }[]; // 이미지 배열 추가
  timestamp: number;
}

export default function MemoListScreen() {
  const router = useRouter();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMemoIds, setSelectedMemoIds] = useState<string[]>([]); // 선택된 메모 ID
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // 다중 선택 모드 여부

  const loadMemos = async () => {
    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      if (storedMemos) {
        setMemos(JSON.parse(storedMemos));
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fixedHeaderContainer}>
        <Text style={styles.header}>내 메모</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="메모 검색..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
              오른쪽 하단의 + 버튼을 눌러 메모를 추가해보세요!
            </Text>
          </View>
        }
        style={styles.memoList}
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
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </Link>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingTop: 20,
  },
  fixedHeaderContainer: {
    backgroundColor: "#f0f0f0",
    paddingBottom: 10,
  },
  memoList: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    fontSize: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memoCategory: {
    fontSize: 12,
    color: "#007AFF",
    marginBottom: 5,
    fontWeight: "bold",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#333",
  },
  memoItem: {
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    backgroundColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedCategoryButton: {
    backgroundColor: "#007AFF",
  },
  categoryButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "bold",
  },
  selectedCategoryButtonText: {
    color: "#fff",
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#007AFF",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 30,
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
  },
  deleteButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
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
});

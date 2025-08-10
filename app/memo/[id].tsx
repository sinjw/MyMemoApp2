import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView as RNScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";

interface ImageAsset {
  uri: string;
  tag: string;
  id: string;
}

interface Memo {
  id: string;
  title: string;
  content: string;
  category: string;
  images?: ImageAsset[]; // 이미지 배열 추가
  timestamp: number;
}

export default function MemoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<ImageAsset[]>([]); // 이미지 상태 추가
  const [isEditing, setIsEditing] = useState(false);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  let backPressCount = 0; // 뒤로가기 버튼 누른 횟수

  useEffect(() => {
    if (id) {
      loadMemo(id as string);
    }
  }, [id]);

  const loadMemo = async (memoId: string) => {
    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      if (storedMemos) {
        const memos: Memo[] = JSON.parse(storedMemos);
        const foundMemo = memos.find((m) => m.id === memoId);
        if (foundMemo) {
          setMemo(foundMemo);
          setTitle(foundMemo.title);
          setContent(foundMemo.content);
          setCategory(foundMemo.category);
          setImages(foundMemo.images || []); // 이미지 불러오기
        }
      }
    } catch (error) {
      console.error("Failed to load memo:", error);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // 여러 이미지 선택 허용
      quality: 1,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        tag: "", // 기본 태그
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // 고유 ID
      }));
      setImages((prevImages) => [...prevImages, ...newImages]);
    }
  };

  const updateImageTag = (id: string, newTag: string) => {
    setImages((prevImages) =>
      prevImages.map((img) => (img.id === id ? { ...img, tag: newTag } : img))
    );
  };

  const removeImage = (id: string) => {
    Alert.alert(
      "이미지 삭제",
      "정말로 이 이미지를 삭제하시겠습니까?",
      [
        { text: "아니오", style: "cancel" },
        {
          text: "예",
          onPress: () => {
            setImages((prevImages) =>
              prevImages.filter((img) => img.id !== id)
            );
          },
        },
      ],
      { cancelable: true }
    );
  };

  const updateMemo = async (navigateBack = false) => {
    if (!memo) return;
    if (
      !title.trim() &&
      !content.trim() &&
      !category.trim() &&
      images.length === 0
    ) {
      Alert.alert("알림", "제목, 내용, 카테고리 또는 이미지를 입력해주세요.");
      return;
    }

    const updatedMemo: Memo = {
      ...memo,
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      images: images, // 이미지 데이터 포함
    };

    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      const memos: Memo[] = storedMemos ? JSON.parse(storedMemos) : [];
      const updatedMemos = memos.map((m) =>
        m.id === updatedMemo.id ? updatedMemo : m
      );
      await AsyncStorage.setItem("memos", JSON.stringify(updatedMemos));
      ToastAndroid.show("메모가 저장되었습니다.", ToastAndroid.SHORT); // 저장 알림
      setIsEditing(false);
      setMemo(updatedMemo); // Update local state
      if (navigateBack) {
        router.back();
      }
    } catch (error) {
      console.error("Failed to update memo:", error);
      Alert.alert("오류", "메모 수정에 실패했습니다.");
    }
  };

  const handleCancelEdit = () => {
    if (memo) {
      setTitle(memo.title);
      setContent(memo.content);
      setCategory(memo.category);
      setImages(memo.images || []); // 이미지도 원래대로 복원
    }
    setIsEditing(false);
  };

  const deleteMemo = async () => {
    Alert.alert(
      "메모 삭제",
      "정말로 이 메모를 삭제하시겠습니까?",
      [
        { text: "아니오", style: "cancel" },
        {
          text: "예",
          onPress: async () => {
            try {
              const storedMemos = await AsyncStorage.getItem("memos");
              const memos: Memo[] = storedMemos ? JSON.parse(storedMemos) : [];
              const remainingMemos = memos.filter((m) => m.id !== id);
              await AsyncStorage.setItem(
                "memos",
                JSON.stringify(remainingMemos)
              );
              Alert.alert("성공", "메모가 삭제되었습니다.");
              router.back(); // Navigate back to list after deletion
            } catch (error) {
              console.error("Failed to delete memo:", error);
              Alert.alert("오류", "메모 삭제에 실패했습니다.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    const backAction = () => {
      if (isEditing) {
        updateMemo(true); // 저장 후 뒤로가기
        return true; // 기본 뒤로가기 동작 방지
      }
      return false; // 기본 동작 (앱 종료) 허용
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [isEditing, title, content, category, images]); // images도 의존성에 추가

  if (!memo) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>메모를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>
        {isEditing ? "메모 수정" : title || "제목 없음"}
      </Text>
      <View style={styles.actionButtons}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => updateMemo(false)}
            >
              <Text style={styles.actionButtonText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.actionButtonText}>취소</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.actionButtonText}>수정</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={deleteMemo}>
          <Text style={styles.actionButtonText}>삭제</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <RNScrollView contentContainerStyle={styles.scrollContentContainer}>
          <TouchableOpacity
            onLongPress={() => setIsEditing(true)} // 길게 눌러 수정 모드 진입
            delayLongPress={1200}
            activeOpacity={1} // 텍스트 입력 시 투명도 변화 방지
            style={styles.inputWrapper}
          >
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              editable={isEditing}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onLongPress={() => setIsEditing(true)} // 길게 눌러 수정 모드 진입
            delayLongPress={1200}
            activeOpacity={1}
            style={styles.inputWrapper}
          >
            <TextInput
              style={styles.categoryInput}
              value={category}
              onChangeText={setCategory}
              editable={isEditing}
            />
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Text style={styles.addImageButtonText}>이미지 추가</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={images}
            renderItem={({ item }) => (
              <View style={styles.imageItemContainer}>
                <TouchableOpacity onPress={() => setFullImageUri(item.uri)}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbnailImage}
                  />
                </TouchableOpacity>
                {isEditing && (
                  <TextInput
                    style={styles.imageTagInput}
                    placeholder="이미지 설명 (선택 사항)"
                    value={item.tag}
                    onChangeText={(text) => updateImageTag(item.id, text)}
                  />
                )}
                {isEditing && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(item.id)}
                  >
                    <Text style={styles.removeImageButtonText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagePreviewList}
          />

          <TouchableOpacity
            onLongPress={() => setIsEditing(true)} // 길게 눌러 수정 모드 진입
            delayLongPress={1200}
            activeOpacity={1}
            style={styles.inputWrapper}
          >
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              editable={isEditing}
            />
          </TouchableOpacity>
        </RNScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!fullImageUri}
        transparent={true}
        onRequestClose={() => setFullImageUri(null)}
      >
        <View style={styles.fullImageModalContainer}>
          <Image
            source={{ uri: fullImageUri || "" }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeFullImageButton}
            onPress={() => setFullImageUri(null)}
          >
            <Text style={styles.closeFullImageButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 20,
    paddingTop: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  titleInput: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    marginBottom: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryInput: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contentInput: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    height: 600,
    marginBottom: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  inputWrapper: {
    marginBottom: 5,
  },
  addImageButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 5,
  },
  addImageButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  imagePreviewList: {
    marginBottom: 15,
  },
  imageItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginRight: 10,
  },
  imageTagInput: {
    flex: 1,
    fontSize: 14,
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  removeImageButton: {
    marginLeft: 10,
    backgroundColor: "#dc3545",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  fullImageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "90%",
    height: "80%",
  },
  closeFullImageButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
  },
  closeFullImageButtonText: {
    color: "#000",
    fontWeight: "bold",
  },
});

import { FontAwesome } from "@expo/vector-icons";
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
import ImageViewer from "react-native-image-zoom-viewer";

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
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [isImageTagVisible, setIsImageTagVisible] = useState(true);
  const [currentImageViewerIndex, setCurrentImageViewerIndex] = useState(0);

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
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        tag: "",
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      }));
      setImages((prevImages) => [...prevImages, ...newImages]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "권한 필요",
        "사진을 촬영하려면 카메라 접근 권한이 필요합니다."
      );
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // No editing for instant capture
      quality: 1,
    });

    if (!result.canceled) {
      const newImage = {
        uri: result.assets[0].uri,
        tag: "", // Default empty tag for new photos
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      };
      setImages((prevImages) => [...prevImages, newImage]);
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
      images: images,
      timestamp: Date.now(),
    };

    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      const memos: Memo[] = storedMemos ? JSON.parse(storedMemos) : [];
      const updatedMemos = memos.map((m) =>
        m.id === updatedMemo.id ? updatedMemo : m
      );
      await AsyncStorage.setItem("memos", JSON.stringify(updatedMemos));
      ToastAndroid.show("메모가 저장되었습니다.", ToastAndroid.SHORT);

      setMemo(updatedMemo);
      setTitle(updatedMemo.title);
      setContent(updatedMemo.content);
      setCategory(updatedMemo.category);
    } catch (error) {
      console.error("Failed to update memo:", error);
      Alert.alert("오류", "메모 수정에 실패했습니다.");
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (memo) {
      setTitle(memo.title);
      setContent(memo.content);
      setCategory(memo.category);
      setImages(memo.images || []);
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
              router.back();
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
        updateMemo(true);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [isEditing, title, content, category, images]);

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
              onPress={() => updateMemo(true)}
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
        <RNScrollView
          contentContainerStyle={styles.scrollContentContainer}
          showsHorizontalScrollIndicator={false}
        >
          <TouchableOpacity
            onLongPress={() => setIsEditing(true)}
            delayLongPress={1200}
            activeOpacity={1}
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
            onLongPress={() => setIsEditing(true)}
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
            <View style={styles.imageButtonContainer}>
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImage}
              >
                <Text style={styles.addImageButtonText}>이미지 추가</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.takePhotoButton}
                onPress={takePhoto}
              >
                <FontAwesome name="camera" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={images}
            renderItem={({ item }) => (
              <View style={styles.imageItemContainer}>
                <TouchableOpacity onPress={() => setSelectedImage(item)}>
                  <View style={styles.circularImageWrapper}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.thumbnailImage}
                    />
                  </View>
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
            onLongPress={() => setIsEditing(true)}
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
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        {selectedImage && (
          <View style={styles.imageViewerModalContainer}> {/* New container for ImageViewer and footer */} 
            <ImageViewer
              imageUrls={images.map(img => ({ url: img.uri, props: { tag: img.tag } }))}
              enableSwipeDown={true}
              onSwipeDown={() => setSelectedImage(null)}
              index={selectedImage ? images.findIndex(img => img.id === selectedImage.id) : 0}
              onChange={(index) => setCurrentImageViewerIndex(index || 0)} // Track current image index
              style={{ flex: 1 }} // Ensure ImageViewer fills the container
            />
            <View style={styles.imageModalFooter}> {/* Moved footer outside ImageViewer */} 
              <View style={styles.imageTagContainer}>
                {isImageTagVisible && (
                  <Text style={styles.imageModalTag}>{images[currentImageViewerIndex]?.tag || ''}</Text>
                )}
                <TouchableOpacity
                  onPress={() => setIsImageTagVisible(!isImageTagVisible)}
                  style={styles.toggleTagButton}
                >
                  <Text style={styles.toggleTagButtonText}>
                    {isImageTagVisible ? '▼' : '▲'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5ED",
    paddingHorizontal: 15,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 40,
    paddingBottom: 20, // Keep consistent with original vertical padding
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
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#815854",
    borderStyle: "solid",
  },
  actionButtonText: {
    color: "#815854",
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
    backgroundColor: "#815854",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flex: 4, // Add this
  },
  imageButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15, // Moved from addImageButton
  },
  takePhotoButton: {
    backgroundColor: "#815854",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
  },
  addImageButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  imagePreviewList: {
    marginBottom: 5,
  },
  imageItemContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  thumbnailImage: {
    width: "100%", // Fill the wrapper
    height: "100%", // Fill the wrapper
    borderRadius: 50, // Keep image circular
  },
  circularImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#815854", // Site's color
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  imageModalFooter: {
    position: "absolute",
    bottom: 0,
    width: "80%", // Set a specific width, e.g., 80% of the parent
    alignSelf: "center", // Center horizontally within the parent
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 20,
    alignItems: "center",
  },
  imageModalTag: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  imageTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content within this container
    flexWrap: 'wrap', // Allow text to wrap if it's too long
  },
  toggleTagButton: {
    marginLeft: 10, // Space between text and button
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly visible background
    borderRadius: 5,
  },
  toggleTagButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageViewerModalContainer: {
    flex: 1,
    position: 'relative', // For absolute positioning of the footer
    backgroundColor: 'black', // Background for the viewer
  },
});

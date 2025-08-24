import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";

interface ImageAsset {
  uri: string;
  tag: string;
  id: string;
}

export default function CreateMemoScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<ImageAsset[]>([]);
  const router = useRouter();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
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
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const newImage = {
        uri: result.assets[0].uri,
        tag: "",
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

  const saveMemo = async (navigateBack = true) => {
    if (
      !title.trim() &&
      !content.trim() &&
      !category.trim() &&
      images.length === 0
    ) {
      Alert.alert("알림", "제목, 내용, 카테고리 또는 이미지를 입력해주세요.");
      if (navigateBack) {
        router.back();
      }
      return;
    }

    const newMemo = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      images: images,
      timestamp: Date.now(),
    };

    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      const memos = storedMemos ? JSON.parse(storedMemos) : [];
      memos.push(newMemo);
      await AsyncStorage.setItem("memos", JSON.stringify(memos));
      if (Platform.OS === "android") {
        ToastAndroid.show("메모가 자동 저장되었습니다.", ToastAndroid.SHORT);
      } else {
        Alert.alert("성공", "메모가 자동 저장되었습니다.");
      }
      if (navigateBack) {
        router.back();
      }
    } catch (error) {
      console.error("Failed to save memo:", error);
      Alert.alert("오류", "메모 저장에 실패했습니다.");
    }
  };

  useEffect(() => {
    const backAction = () => {
      if (
        title.trim() ||
        content.trim() ||
        category.trim() ||
        images.length > 0
      ) {
        saveMemo(true);
        return true;
      } else {
        router.back();
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [title, content, category, images]);

  const renderImageItem = ({ item }: { item: ImageAsset }) => (
    <View style={styles.imageItemContainer}>
      <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
      <TextInput
        style={styles.imageTagInput}
        placeholder="태그 입력"
        value={item.tag}
        onChangeText={(text) => updateImageTag(item.id, text)}
      />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(item.id)}
      >
        <Text style={styles.removeImageButtonText}>X</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            style={styles.titleInput}
            placeholder="제목"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.categoryInput}
            placeholder="카테고리 (선택 사항)"
            value={category}
            onChangeText={setCategory}
          />
          <View style={styles.imageButtonContainer}>
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Text style={styles.addImageButtonText}>이미지 추가</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.takePhotoButton}
              onPress={takePhoto}
            >
              <FontAwesome name="camera" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagePreviewList}
          />
          <TextInput
            style={styles.contentInput}
            placeholder="내용"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveMemo()}
            >
              <Text style={styles.buttonText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9EBDE",
    padding: 20,
    paddingTop: 70,
    paddingBottom: 70,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  titleInput: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#815854",
    borderStyle: "solid",
  },
  categoryInput: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#815854",
    borderStyle: "solid",
  },
  addImageButton: {
    backgroundColor: "#815854",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flex: 4,
  },
  imageButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
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
    marginTop: 15,
    marginBottom: 15,
  },
  imageItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,

    backgroundColor: "#FFF5ED",
    borderRadius: 10,
    padding: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 200,
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
  contentInput: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    height: 450,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#815854",
    borderStyle: "solid",
  },
  saveButton: {
    backgroundColor: "#815854",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#815854",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 70,
    marginHorizontal: 5,
  },
});

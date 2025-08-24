import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Memo {
  id: string;
  title: string;
  content: string;
  category: string;
  images?: { uri: string; tag: string }[];
  timestamp: number;
}

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const router = useRouter();
  const [redTextDays, setRedTextDays] = useState([5, 6]);
  const [allMemos, setAllMemos] = useState<Memo[]>([]);
  const [showMemosModal, setShowMemosModal] = useState(false);
  const [selectedDateMemos, setSelectedDateMemos] = useState<Memo[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadAllMemos = async () => {
    try {
      const storedMemos = await AsyncStorage.getItem("memos");
      if (storedMemos) {
        const parsedMemos = JSON.parse(storedMemos);
        setAllMemos(parsedMemos);
        console.log("Loaded all memos:", parsedMemos.length, "memos");
      } else {
        console.log("No memos found in AsyncStorage.");
      }
    } catch (error) {
      console.error("Failed to load all memos for calendar:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllMemos();
    }, [])
  );

  const memoCountsByDate = useMemo(() => {
    const counts: { [key: string]: number } = {};
    allMemos.forEach((memo) => {
      const date = new Date(memo.timestamp);
      const dateString = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      counts[dateString] = (counts[dateString] || 0) + 1;
    });
    return counts;
  }, [allMemos]);

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const renderHeader = () => {
    const monthNames = [
      "1월",
      "2월",
      "3월",
      "4월",
      "5월",
      "6월",
      "7월",
      "8월",
      "9월",
      "10월",
      "11월",
      "12월",
    ];
    const month = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    const goToPreviousMonth = () => {
      setCurrentDate(
        (prevDate) =>
          new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1)
      );
    };

    const goToNextMonth = () => {
      setCurrentDate(
        (prevDate) =>
          new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1)
      );
    };

    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Text style={styles.navButton}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>{`${year}년 ${month}`}</Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Text style={styles.navButton}>{">"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];

    const toggleRedDay = (dayIndex: number) => {
      setRedTextDays((prev) =>
        prev.includes(dayIndex)
          ? prev.filter((d) => d !== dayIndex)
          : [...prev, dayIndex]
      );
    };

    return (
      <View style={styles.daysOfWeekContainer}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={day}
            onLongPress={() => toggleRedDay(index)}
            style={styles.dayOfWeekCell}
          >
            <Text
              style={[
                styles.dayOfWeekText,
                redTextDays.includes(index) && { color: "red" },
              ]}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    const allDays = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
      const day = prevMonthLastDay - firstDayOfMonth + 1 + i;

      const handleDayLongPress = () => {
        const fullDate = new Date(year, month - 1, day);
        const targetDateString = `${fullDate.getFullYear()}-${(
          fullDate.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-${fullDate.getDate().toString().padStart(2, "0")}`;

        const memosForThisDate = allMemos.filter((memo) => {
          const memoDate = new Date(memo.timestamp);
          const memoDateString = `${memoDate.getFullYear()}-${(
            memoDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${memoDate
            .getDate()
            .toString()
            .padStart(2, "0")}`;
          return memoDateString === targetDateString;
        });

        console.log("Long-pressed date (prev month):", fullDate.toDateString());
        console.log(
          "Memos for this date (prev month):",
          memosForThisDate.length,
          "memos"
        );
        setSelectedDateMemos(memosForThisDate);
        setSelectedDate(fullDate);
        setShowMemosModal(true);
      };

      allDays.push(
        <TouchableOpacity
          key={`prev-${day}`}
          style={styles.dayCell}
          onLongPress={handleDayLongPress}
        >
          <Text style={[styles.dayText, { color: "#ccc" }]}>{day}</Text>
        </TouchableOpacity>
      );
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayOfWeek = (firstDayOfMonth + i - 1) % 7;
      const dateString = `${year}-${(month + 1).toString().padStart(2, "0")}-${i
        .toString()
        .padStart(2, "0")}`;
      const memoCount = memoCountsByDate[dateString] || 0;

      const handleDayLongPress = () => {
        const fullDate = new Date(year, month, i);
        const targetDateString = `${fullDate.getFullYear()}-${(
          fullDate.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-${fullDate.getDate().toString().padStart(2, "0")}`;

        const memosForThisDate = allMemos.filter(({ timestamp }) => {
          const d = new Date(timestamp);
          const memoDateString = [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0"),
          ].join("-");

          return memoDateString === targetDateString;
        });

        console.log(
          "Long-pressed date (current month):",
          fullDate.toDateString()
        );
        console.log(
          "Memos for this date (current month):",
          memosForThisDate.length,
          "memos"
        );
        setSelectedDateMemos(memosForThisDate);
        setSelectedDate(fullDate);
        setShowMemosModal(true);
      };

      allDays.push(
        <TouchableOpacity
          key={i}
          style={styles.dayCell}
          onLongPress={handleDayLongPress}
        >
          <Text
            style={[
              styles.dayText,
              redTextDays.includes(dayOfWeek) && { color: "red" },
            ]}
          >
            {i}
          </Text>
          {memoCount > 0 && (
            <View style={styles.memoCountContainer}>
              <Text
                style={styles.memoCountText}
              >{`${memoCount}개의 메모`}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    const totalCells = allDays.length;
    const remainingCells = 42 - totalCells;

    for (let i = 1; i <= remainingCells; i++) {
      const handleDayLongPress = () => {
        const fullDate = new Date(year, month + 1, i);
        const targetDateString = `${fullDate.getFullYear()}-${(
          fullDate.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-${fullDate.getDate().toString().padStart(2, "0")}`;

        const memosForThisDate = allMemos.filter((memo) => {
          const memoDate = new Date(memo.timestamp);
          const memoDateString = `${memoDate.getFullYear()}-${(
            memoDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${memoDate
            .getDate()
            .toString()
            .padStart(2, "0")}`;
          return memoDateString === targetDateString;
        });

        console.log("Long-pressed date (next month):", fullDate.toDateString());
        console.log(
          "Memos for this date (next month):",
          memosForThisDate.length,
          "memos"
        );
        setSelectedDateMemos(memosForThisDate);
        setSelectedDate(fullDate);
        setShowMemosModal(true);
      };

      allDays.push(
        <TouchableOpacity
          key={`next-${i}`}
          style={styles.dayCell}
          onLongPress={handleDayLongPress}
        >
          <Text style={[styles.dayText, { color: "#ccc" }]}>{i}</Text>
        </TouchableOpacity>
      );
    }

    const rows = [];
    let cellsInRow = [];
    for (let i = 0; i < allDays.length; i++) {
      cellsInRow.push(allDays[i]);
      if ((i + 1) % 7 === 0) {
        rows.push(
          <View key={`row-${i / 7}`} style={styles.calendarRow}>
            {cellsInRow}
          </View>
        );
        cellsInRow = [];
      }
    }

    return <View style={styles.daysContainer}>{rows}</View>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.calendarWrapper}>
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderDays()}
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showMemosModal}
        onRequestClose={() => setShowMemosModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {selectedDate
                ? `${selectedDate.getFullYear()}년 ${
                    selectedDate.getMonth() + 1
                  }월 ${selectedDate.getDate()}일 메모`
                : "메모"}
            </Text>

            {selectedDateMemos.length > 0 ? (
              <View style={styles.listContainer}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                  {selectedDateMemos.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.modalMemoItem}
                      onPress={() => {
                        setShowMemosModal(false);
                        router.push({
                          pathname: "/memo/[id]",
                          params: {
                            id: item.id,
                            title: item.title,
                            content: item.content,
                            category: item.category,
                            timestamp: item.timestamp.toString(),
                          },
                        });
                      }}
                    >
                      <Text style={styles.modalMemoTitle}>
                        {item.title || "제목 없음"}
                      </Text>
                      <Text style={styles.modalMemoContent}>
                        {item.category || "카테고리 없음"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <Text style={styles.noMemosText}>
                해당 날짜에 메모가 없습니다.
              </Text>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMemosModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>닫기</Text>
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
    backgroundColor: "#F9EBDE",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#815854",
  },
  navButton: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#815854",
    paddingHorizontal: 10,
  },
  daysOfWeekContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  dayOfWeekText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#815854",
    textAlign: "center",
  },
  dayOfWeekCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  daysContainer: {
    flexDirection: "column",
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dayCell: {
    width: `${100 / 7}%`,
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    padding: 5,
  },
  calendarRow: {
    flexDirection: "row",
    flex: 1,
  },
  dayText: {
    fontSize: 18,
    color: "#333",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#815854",
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "80%",
    width: "90%",
  },
  listContainer: {
    flex: 1,
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalMemoItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    width: "100%",
  },
  modalMemoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#444",
  },
  modalMemoContent: {
    fontSize: 14,
    color: "#666",
  },
  noMemosText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    padding: 20,
  },
  modalCloseButton: {
    backgroundColor: "#815854",
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  memoCountContainer: {
    position: "absolute",
    bottom: 5,
    right: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
  },
  memoCountText: {
    color: "#A4193D",
    fontSize: 14,
    fontWeight: "bold",
  },
  calendarWrapper: {
    flex: 1,
    paddingVertical: 70,
    backgroundColor: "#F9EBDE",
  },
});

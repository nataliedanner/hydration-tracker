// create a simple React dashboard that displays the title "Hydration Tracker"
import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';

const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];

function CalendarScreen({ onBack, totalsByDate, goalOunces }) {
  const [calendarDate, setCalendarDate] = useState(new Date());

  function getMonthGrid(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const daysInMonth = end.getDate();
    const startWeekday = start.getDay(); // 0 = Sun

    const grid = [];
    // leading blanks
    for (let i = 0; i < startWeekday; i++) grid.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const cur = new Date(year, month, d);
      const iso = cur.toISOString().slice(0, 10);
      grid.push({ day: d, date: cur, iso });
    }

    return { grid, monthLabel: start.toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
  }

  const { grid, monthLabel } = getMonthGrid(calendarDate);
  const monthTotals = grid.filter(Boolean).map(d => totalsByDate[d.iso] || 0);
  const maxInMonth = monthTotals.length ? Math.max(...monthTotals) : 0;

  function prevMonth() {
    setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function onPressDay(iso) {
    const total = totalsByDate[iso] || 0;
    Alert.alert(iso, `${total} oz`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.modal, { margin: 16 }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navText}>◀</Text></TouchableOpacity>
          <Text style={styles.calendarTitle}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navText}>▶</Text></TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w => (
            <Text key={w} style={styles.weekDay}>{w}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((cell, idx) => {
            if (!cell) return <View key={`b${idx}`} style={styles.cellEmpty} />;
            const total = totalsByDate[cell.iso] || 0;
            const percent = goalOunces != null && goalOunces > 0
              ? Math.min(total / goalOunces, 1)
              : maxInMonth > 0
                ? Math.min(total / maxInMonth, 1)
                : 0;
            const innerSize = 28 * percent + 6; // 6..34
            return (
              <Pressable key={cell.iso} style={styles.cell} onPress={() => onPressDay(cell.iso)}>
                <View style={styles.ringWrap}>
                  <View style={[styles.ring, { borderColor: percent > 0 ? '#007AFF' : '#e6e6e6' }]} />
                  {percent > 0 ? (
                    <View style={[styles.innerFill, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]} />
                  ) : null}
                  <Text style={styles.dayText}>{cell.day}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
          <TouchableOpacity onPress={onBack} style={[styles.modalBtn, styles.modalAdd]}>
            <Text style={[styles.modalBtnText, { color: '#fff' }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function App() {
  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [ounces, setOunces] = useState('');
  const [timeOfDay, setTimeOfDay] = useState(TIMES[0]);
  const [editingId, setEditingId] = useState(null);

  // goal state and modal
  const [goalOunces, setGoalOunces] = useState(null); // number or null
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // screen state: 'home' | 'calendar'
  const [currentScreen, setCurrentScreen] = useState('home');

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // compute total ounces from entries
  const totalOunces = entries.reduce((sum, e) => {
    const val = Number(e.ounces);
    return sum + (Number.isFinite(val) ? val : 0);
  }, 0);

  const remainingToGoal = goalOunces != null ? Math.max(goalOunces - totalOunces, 0) : null;

  // aggregated totals per day (yyyy-mm-dd)
  const totalsByDate = useMemo(() => {
    return entries.reduce((acc, e) => {
      const d = new Date(e.createdAt);
      const iso = d.toISOString().slice(0, 10); // yyyy-mm-dd
      acc[iso] = (acc[iso] || 0) + Number(e.ounces || 0);
      return acc;
    }, {});
  }, [entries]);

  function openAddModal(entry = null) {
    // Guard against being called with a press event object (onPress={openAddModal})
    if (entry && entry.nativeEvent) {
      entry = null;
    }

    // Only populate fields if entry is a real object with a valid ounces value.
    if (entry && typeof entry === 'object' && entry.ounces != null) {
      setOunces(String(entry.ounces));
      setTimeOfDay(entry.timeOfDay ?? TIMES[0]);
      setEditingId(entry.id != null ? entry.id : null);
    } else {
      // For a fresh add or any invalid entry object, reset the input to an empty string.
      setOunces('');
      setTimeOfDay(TIMES[0]);
      setEditingId(null);
    }
    setModalVisible(true);
  }

  function addEntry() {
    const oz = parseFloat(ounces);
    if (Number.isNaN(oz) || oz <= 0) {
      Alert.alert('Invalid input', 'Please enter a positive number of ounces.');
      return;
    }

    if (editingId) {
      // update existing entry
      setEntries(prev =>
        prev.map(e => (e.id === editingId ? { ...e, ounces: oz, timeOfDay } : e))
      );
      setEditingId(null);
    } else {
      const newEntry = {
        id: Date.now().toString(),
        ounces: oz,
        timeOfDay,
        createdAt: new Date().toISOString(),
      };
      setEntries(prev => [newEntry, ...prev]);
    }

    setModalVisible(false);
  }

  function confirmDelete(id) {
    Alert.alert('Delete entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEntries(prev => prev.filter(e => e.id !== id));
        },
      },
    ]);
  }

  function renderItem({ item }) {
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.ounces} oz</Text>
          <Text style={styles.itemSub}>{item.timeOfDay} • {time}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => openAddModal(item)}
            style={[styles.smallBtn, styles.editBtn]}
            accessibilityLabel="Edit entry"
          >
            <Text style={styles.smallBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => confirmDelete(item.id)}
            style={[styles.smallBtn, styles.deleteBtn]}
            accessibilityLabel="Delete entry"
          >
            <Text style={[styles.smallBtnText, { color: '#B00020' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function openGoalModal() {
    setGoalInput(goalOunces != null ? String(goalOunces) : '');
    setGoalModalVisible(true);
  }

  function saveGoal() {
    const g = parseFloat(goalInput);
    if (Number.isNaN(g) || g <= 0) {
      Alert.alert('Invalid goal', 'Please enter a positive number of ounces for your goal.');
      return;
    }
    setGoalOunces(g);
    setGoalModalVisible(false);
  }

  // render calendar screen if selected
  if (currentScreen === 'calendar') {
    return <CalendarScreen onBack={() => setCurrentScreen('home')} totalsByDate={totalsByDate} goalOunces={goalOunces} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Hydration Tracker</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={openGoalModal} style={styles.goalEditBtn}>
              <Text style={styles.goalEditText}>{goalOunces != null ? `${goalOunces} oz goal` : 'Set goal'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCurrentScreen('calendar')} style={styles.calendarBtn}>
              <Text style={styles.calendarBtnText}>View Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Today's intake ({entries.length})</Text>

        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No entries yet — add your first glass.</Text>}
          style={styles.list}
        />

        {/* total ounces row */}
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total today</Text>
            <Text style={styles.totalValue}>{totalOunces} oz</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            {goalOunces == null ? (
              <Text style={styles.goalHint}>No goal set</Text>
            ) : remainingToGoal > 0 ? (
              <Text style={styles.remaining}>{remainingToGoal} oz away from goal</Text>
            ) : (
              <Text style={styles.goalReached}>Goal reached!</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => openAddModal()}
          accessibilityLabel="Add water intake"
        >
          <Text style={styles.buttonText}>Add Water Intake</Text>
        </TouchableOpacity>
      </View>

      {/* entry modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Water Intake' : 'Add Water Intake'}</Text>

            <Text style={styles.inputLabel}>Ounces</Text>
            <TextInput
              value={ounces ?? ''}
              onChangeText={setOunces}
              keyboardType="numeric"
              placeholder="e.g. 8"
              style={styles.input}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Time of day</Text>
            <View style={styles.timeRow}>
              {TIMES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => setTimeOfDay(t)}
                  style={[
                    styles.timeButton,
                    timeOfDay === t && styles.timeButtonActive,
                  ]}
                >
                  <Text style={[styles.timeButtonText, timeOfDay === t && styles.timeButtonTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.modalCancel]}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={addEntry} style={[styles.modalBtn, styles.modalAdd]}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{editingId ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* goal modal */}
      <Modal
        visible={goalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Daily Goal (oz)</Text>

            <Text style={styles.inputLabel}>Ounces</Text>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="numeric"
              placeholder="e.g. 64"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setGoalModalVisible(false)} style={[styles.modalBtn, styles.modalCancel]}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={saveGoal} style={[styles.modalBtn, styles.modalAdd]}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { paddingTop: 8, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#111' },
  goalEditBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  goalEditText: { color: '#007AFF', fontWeight: '600' },
  calendarBtn: { paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8, borderRadius: 8, borderWidth: 1, borderColor: '#007AFF' },
  calendarBtnText: { color: '#007AFF', fontWeight: '600' },
  date: { marginTop: 6, fontSize: 13, color: '#666' },
  content: { flex: 1, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  list: { flex: 1 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: { fontSize: 16, fontWeight: '700', color: '#0a56a3' },
  itemSub: { fontSize: 13, color: '#666' },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  inputLabel: { fontSize: 13, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
  },
  timeButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  timeButtonText: { color: '#333' },
  timeButtonTextActive: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8 },
  modalCancel: { backgroundColor: '#f1f1f1' },
  modalAdd: { backgroundColor: '#007AFF' },
  modalBtnText: { color: '#111', fontWeight: '600' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 6,
    backgroundColor: 'transparent',
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#F1B0B6',
  },
  smallBtnText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  totalLabel: { fontSize: 14, color: '#444', fontWeight: '600' },
  totalValue: { fontSize: 18, color: '#007AFF', fontWeight: '800' },

  goalHint: { fontSize: 13, color: '#666' },
  remaining: { fontSize: 14, color: '#D9534F', fontWeight: '700' },
  goalReached: { fontSize: 14, color: '#2b8a3e', fontWeight: '700' },

  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calendarTitle: { fontSize: 16, fontWeight: '700' },
  navBtn: { padding: 6 },
  navText: { fontSize: 16, color: '#007AFF' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekDay: { width: 38, textAlign: 'center', color: '#666', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: 38, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  cellEmpty: { width: 38, height: 54, marginBottom: 6 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', width: 38, height: 38 },
  ring: { position: 'absolute', width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: '#e6e6e6' },
  innerFill: { position: 'absolute', backgroundColor: '#007AFF', opacity: 0.9 },
  dayText: { position: 'absolute', color: '#111', fontSize: 12, fontWeight: '600' },
});

export default App;

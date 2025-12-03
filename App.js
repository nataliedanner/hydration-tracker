// create a simple React dashboard that displays the title "Hydration Tracker"
import React, { useState } from 'react';
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

function App() {
  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [ounces, setOunces] = useState('');
  const [timeOfDay, setTimeOfDay] = useState(TIMES[0]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  function openAddModal() {
    setOunces('');
    setTimeOfDay(TIMES[0]);
    setModalVisible(true);
  }

  function addEntry() {
    const oz = parseFloat(ounces);
    if (Number.isNaN(oz) || oz <= 0) {
      Alert.alert('Invalid input', 'Please enter a positive number of ounces.');
      return;
    }
    const newEntry = {
      id: Date.now().toString(),
      ounces: oz,
      timeOfDay,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [newEntry, ...prev]);
    setModalVisible(false);
  }

  function renderItem({ item }) {
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={styles.card}>
        <View>
          <Text style={styles.itemName}>{item.ounces} oz</Text>
          <Text style={styles.itemSub}>{item.timeOfDay} • {time}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hydration Tracker</Text>
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

        <TouchableOpacity
          style={styles.button}
          onPress={openAddModal}
          accessibilityLabel="Add water intake"
        >
          <Text style={styles.buttonText}>Add Water Intake</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Water Intake</Text>

            <Text style={styles.inputLabel}>Ounces</Text>
            <TextInput
              value={ounces}
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
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Add</Text>
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
  header: { paddingTop: 8, paddingBottom: 12, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#111' },
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
});

export default App;

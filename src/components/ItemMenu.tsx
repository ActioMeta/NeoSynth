import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ItemMenuOption = {
  label: string;
  icon: string;
  onPress: () => void;
};

export type ItemMenuProps = {
  visible: boolean;
  onClose: () => void;
  options: ItemMenuOption[];
  anchorPosition?: { top: number; left: number };
};

export default function ItemMenu({ visible, onClose, options, anchorPosition }: ItemMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.menu, anchorPosition && { top: anchorPosition.top, left: anchorPosition.left }]}> 
        {options.map((opt, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => { onClose(); opt.onPress(); }}>
            <Ionicons name={opt.icon as any} size={20} color="#5752D7" style={{ marginRight: 12 }} />
            <Text style={styles.menuLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menu: {
    position: 'absolute',
    right: 24,
    top: 120,
    backgroundColor: '#181818',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  menuLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});

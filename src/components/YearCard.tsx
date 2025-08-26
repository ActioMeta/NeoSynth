import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type YearCardProps = {
  year: string;
  onPress: () => void;
};

const YearCard: React.FC<YearCardProps> = ({ year, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <Text style={styles.year}>{year}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    width: 80,
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 12,
  },
  year: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default YearCard;

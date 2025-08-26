import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type GenreCardProps = {
  name: string;
  onPress: () => void;
};

const GenreCard: React.FC<GenreCardProps> = ({ name, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <Text style={styles.name} numberOfLines={1}>{name}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default GenreCard;

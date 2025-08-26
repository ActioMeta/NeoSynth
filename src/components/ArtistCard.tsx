import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ArtistCardProps = {
  name: string;
  imageUrl?: string;
  onPress: () => void;
};

const ArtistCard: React.FC<ArtistCardProps> = ({ name, imageUrl, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    {imageUrl ? (
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
    ) : (
      <View style={[styles.image, styles.placeholder]}>
        <Ionicons name="person" size={40} color="#5752D7" />
      </View>
    )}
    <Text style={styles.name} numberOfLines={1}>{name}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#181818',
    marginBottom: 8,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ArtistCard;

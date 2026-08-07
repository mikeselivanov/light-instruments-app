import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NameRow } from '../components/NameRow';
import { useFavorites } from '../lib/favorites';
import { NAMES } from '../lib/data';
import { colors, fonts } from '../lib/theme';

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const { favoriteIds } = useFavorites();
  const list = NAMES.filter((n) => favoriteIds.has(n.id));

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      data={list}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <NameRow name={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Назад</Text>
          </Pressable>
          <Text style={styles.title}>Избранное</Text>
          <Text style={styles.sub}>
            {list.length > 0 ? `${list.length} сохранено` : 'Пока ничего не отмечено'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          Отмечайте имена звёздочкой в списке или на экране деталей — они появятся здесь.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    flexGrow: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  back: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentDim,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    fontSize: 22,
    color: colors.parchment,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.parchmentDim,
    marginBottom: 8,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.parchmentDim,
    marginTop: 24,
  },
});

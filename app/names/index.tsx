import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NameRow } from '../../components/NameRow';
import { NAMES, getNamesByCategory } from '../../lib/data';
import { colors, fonts } from '../../lib/theme';

export default function AllNames() {
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category?: string }>();

  const list = category ? getNamesByCategory(category) : NAMES;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20 },
      ]}
      data={list}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <NameRow name={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Назад</Text>
          </Pressable>
          <Text style={styles.title}>{category ? category : 'Все имена'}</Text>
          <Text style={styles.sub}>
            {list.length} {category ? 'имя' : 'имени · по порядку книги'}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
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
});

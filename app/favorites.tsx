import { FlatList, StyleSheet, Text, View } from 'react-native';
import { HomeButton } from '../components/HomeButton';
import { NameRow } from '../components/NameRow';
import { useScreenPadding } from '../lib/safe-area';
import { useFavorites } from '../lib/favorites';
import { NAMES } from '../lib/data';
import { colors, fonts, type } from '../lib/theme';
import { ScreenTransition } from '../components/ScreenTransition';

export default function Favorites() {
  const padding = useScreenPadding();
  const { favoriteIds } = useFavorites();
  const list = NAMES.filter((n) => favoriteIds.has(n.id));

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.void }}
        contentContainerStyle={[styles.content, padding]}
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NameRow name={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <HomeButton />
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
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginBottom: 10,
  },
  empty: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    marginTop: 24,
  },
});

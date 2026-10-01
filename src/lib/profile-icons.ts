const PROFILE_ICON_SLUGS: Record<string, string> = {
  Apple: "apple",
  Banana: "banana",
  Blueberry: "blueberry",
  Coconut: "coconut",
  Cucumber: "cucumber",
  Grapes: "grape",
  Kiwi: "kiwi",
  Lemon: "lemon",
  Lime: "lime",
  Mango: "mango",
  Orange: "orange",
  Papaya: "papaya",
  Peach: "peach",
  Pear: "pear",
  Pineapple: "pineapple",
  Pomegranate: "pomegranate",
  Raspberry: "raspberry",
  Strawberry: "strawberry",
  Tomato: "tomato",
  Watermelon: "watermelon",
  Zucchini: "zucchini",
};

export function getProfileIconPath(cuteName: string) {
  const slug = PROFILE_ICON_SLUGS[cuteName];
  return slug ? `/statixel/icons/profileicons/${slug}icon.png` : null;
}

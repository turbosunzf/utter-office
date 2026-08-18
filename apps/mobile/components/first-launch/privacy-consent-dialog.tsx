import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface";

interface Props {
  visible: boolean;
  confirming: boolean;
  onAgree: () => void;
}

export function PrivacyConsentDialog({
  visible,
  confirming,
  onAgree,
}: Props) {
  const onDisagree = () => {
    Alert.alert(
      "需要同意后才能使用",
      "同意《隐私政策》后才可继续使用 Utter Office。",
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDisagree}
    >
      <View className="flex-1 bg-black/40 items-center justify-center px-6">
        <Pressable onPress={() => {}} className="w-full max-w-sm">
          <ElevatedSurface className="p-0">
            <View className="px-5 pt-5 pb-3">
              <Text className="text-lg font-semibold text-foreground">
                个人信息保护指引
              </Text>
            </View>
            <ScrollView className="max-h-80 px-5" bounces={false}>
              <Text className="text-sm leading-6 text-muted-foreground">
                欢迎使用 Utter Office。在使用本应用前，请阅读并同意《隐私政策》与《用户服务条款》。
                {"\n\n"}
                为提供登录、工作区协作、会议录音等服务，我们会在您授权后处理：账号信息（如邮箱）、设备信息（用于保证服务稳定），以及您主动发起录音时的音频与现场照片。麦克风、相机等权限仅在您使用对应功能时申请。
                {"\n\n"}
                如您同意以上内容，请点击「同意」开始使用。我们将按隐私政策保护您的个人信息。
              </Text>
            </ScrollView>
            <View className="flex-row gap-3 px-5 py-4">
              <Button
                variant="outline"
                className="flex-1"
                disabled={confirming}
                onPress={onDisagree}
              >
                <Text>不同意</Text>
              </Button>
              <Button
                className="flex-1"
                disabled={confirming}
                onPress={onAgree}
              >
                <Text>{confirming ? "请稍候…" : "同意"}</Text>
              </Button>
            </View>
          </ElevatedSurface>
        </Pressable>
      </View>
    </Modal>
  );
}

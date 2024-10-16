import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTabs,
  IonTitle,
  IonToast,
  IonToolbar,
  useIonRouter,
  useIonToast,
  useIonViewWillEnter,
} from "@ionic/react";
import React, { Dispatch, SetStateAction, useEffect } from "react";
import { RouteComponentProps } from "react-router";
import GroupMemberList from "../components/GroupMemberList";
import {
  getAllGroupsOfUser,
  getGroupById,
  Group,
  joinGroup,
  leaveGroup,
  Session,
  updateGroup,
  userInGroup,
} from "../api/group";
import { clipboard, createOutline } from "ionicons/icons";
import { User } from "../api/user";
import { endSession, getSessionOfGroup } from "../api/sessions";

interface GroupDetailProps
  extends RouteComponentProps<{
    id: string;
  }> {
  user: User;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setIsToastOpen: Dispatch<SetStateAction<boolean>>;
  setToastMessage: Dispatch<SetStateAction<string>>;
  setActiveSessions: Dispatch<SetStateAction<Session[]>>;
}

const GroupDetail: React.FC<GroupDetailProps> = ({
  match,
  user,
  setGroups,
  setIsToastOpen,
  setToastMessage,
  setActiveSessions,
}) => {
  const [group, setGroup] = React.useState<Group>({
    id: "",
    name: "",
    created: "",
    members: [],
  });
  const [session, setSession] = React.useState<Session | undefined>();
  const id = match.params.id;

  const router = useIonRouter();

  useEffect(() => {
    getGroupById(id, setGroup);
    getSessionOfGroup(id, setSession);
    console.log(session);
    // console.log(group, user);
  }, [id]);

  let sessionStart;
  if (session?.start) sessionStart = new Date(session?.start);

  const getGroupLink = () => {
    return `https://12.viscon-hackathon.ch/group/${id}`;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Group {group?.name}</IonTitle>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/groups" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              disabled={!userInGroup(group, user)}
              onClick={() => {
                console.log("edit");
              }}
              id="openAlert"
            >
              <IonIcon icon={createOutline} slot="icon-only"></IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {session && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Active Session</IonCardTitle>
              <IonCardSubtitle>
                {sessionStart
                  ? ("0" + sessionStart.getHours()).slice(-2) +
                    ":" +
                    ("0" + sessionStart.getMinutes()).slice(-2)
                  : "no active Session"}
              </IonCardSubtitle>
              <IonButtons>
                <IonButton
                  onClick={async () => {
                    await endSession(session.id as string);
                    setActiveSessions((sessions) =>
                      sessions.filter((sess) => sess.id != id)
                    );
                    setToastMessage("Successfully Ended Session!");
                    setIsToastOpen(true);
                  }}
                >
                  End Session
                </IonButton>
              </IonButtons>
            </IonCardHeader>
          </IonCard>
        )}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Members</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <GroupMemberList members={group?.members} />
          </IonCardContent>
        </IonCard>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Share Link</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>{getGroupLink()}</p>
            <IonButton
              id="open-toast"
              onClick={() => {
                navigator.clipboard.writeText(getGroupLink());
              }}
            >
              Copy
            </IonButton>
            <IonToast
              trigger="open-toast"
              message="Copied to Clipboard"
              duration={2000}
              position="bottom"
              positionAnchor="tabs"
              icon={clipboard}
            ></IonToast>
          </IonCardContent>
        </IonCard>
        {userInGroup(group, user) ? (
          <IonButton
            color="danger"
            fill="solid"
            expand="block"
            onClick={async () => {
              await leaveGroup(id);
              const groups = await getAllGroupsOfUser();
              setGroups(groups);
              router.push("/groups");
            }}
          >
            Leave
          </IonButton>
        ) : null}
        {!userInGroup(group, user) ? (
          <IonButton
            color="primary"
            fill="solid"
            expand="block"
            onClick={async () => {
              await joinGroup(group.id);

              getGroupById(id, setGroup);
              console.log(group);
            }}
          >
            Join
          </IonButton>
        ) : null}
        <IonAlert
          trigger="openAlert"
          header="Change Group Name"
          buttons={[
            {
              text: "Save",
              cssClass: "alert-button-confirm",
              handler: async (alertData) => {
                if (alertData.name !== "") {
                  console.log(alertData.name);
                  await updateGroup(group.id, alertData.name);
                  getGroupById(id, setGroup);
                  let nameInput = document.getElementById(
                    "name"
                  ) as HTMLInputElement;
                  nameInput.value = "";
                } else {
                  setToastMessage("Empty Name");
                  setIsToastOpen(true);
                }
              },
            },
            { text: "Dismiss", cssClass: "alert-button-cancel" },
          ]}
          inputs={[
            {
              id: "name",
              name: "name",
              placeholder: group.name,
            },
          ]}
        ></IonAlert>
      </IonContent>
    </IonPage>
  );
};

export default GroupDetail;

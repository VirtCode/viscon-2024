import { RouteComponentProps } from "react-router";
import React, {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addSessionTables,
  endSession,
  getSession,
  removeSessionTables,
} from "../api/sessions";
import { Session as ISession } from "../api/group";
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import * as d3 from "d3";
import { getMensaLayout } from "../api/mensas";
import { Selection } from "d3";
import { refresh } from "ionicons/icons";
import "./Session.css";
import { Session as SessionType } from "../api/group";

interface SessionProps
  extends RouteComponentProps<{
    id: string;
  }> {
  setActiveSessions: Dispatch<SetStateAction<SessionType[]>>;
  setToastMessage: Dispatch<SetStateAction<string>>;
  setIsToastOpen: Dispatch<SetStateAction<boolean>>;
}

const Session: React.FC<SessionProps> = ({
  match,
  setIsToastOpen,
  setToastMessage,
  setActiveSessions,
}) => {
  const sessionId: string = match.params.id;
  const [session, setSession] = useState<ISession>();
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [layout, setLayout] = useState<string>("");
  const [tables, setTables] = useState<Array<string>>([]);
  const tableRef: MutableRefObject<Array<string>> = useRef(tables);
  const ref = useRef<HTMLDivElement>(null);

  const areTablesDirty = useMemo(() => {
    if (!session) return false;
    if (session?.tables?.length !== tables.length) return true;
    else
      return (
        session.tables?.filter((t) => tables.includes(t.id)).length !==
        session.tables?.length
      );
  }, [tables, session]);

  useEffect(() => {
    tableRef.current = tables;
    const svgEl = document.querySelector(
      "ion-router-outlet > .ion-page:not(.ion-page-hidden) svg"
    );
    if (svgEl) {
      tables.forEach((table) => {
        const rect = document.getElementById(table);
        if (!rect) return;
        rect.setAttribute("data-selected", "true");
      });
    }
  }, [tables, layout]);

  useEffect(() => {
    if (!session || tables.length > 0) return;
    setTables(session.tables?.map((t) => t.id) || []);
    const fetchLayout = async () => {
      const layout = await getMensaLayout(session.mensa.id);
      setLayout(layout);
    };
    fetchLayout().then(() =>
      console.log("Fetched layout from ", session.mensa?.name)
    );
  }, [session]);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then(setSession)
      .catch((err) => console.error("Error whilst fetching session: " + err));
  }, [sessionId]);

  useEffect(() => {
    if (!layout) return;
    const selection: Selection<Element, any, any, any> = d3.select(
      "ion-router-outlet > .ion-page:not(.ion-page-hidden) svg"
    );
    selection.call(zoom);
    const svgEl = document.querySelector(
      "ion-router-outlet > .ion-page:not(.ion-page-hidden) svg"
    );
    if (svgEl) svgEl.addEventListener("click", handleSvgClick as any);
  }, [layout]);

  const resetZoomAndPan = () => {
    const selection: Selection<Element, any, any, any> = d3.select(
      "ion-router-outlet > .ion-page:not(.ion-page-hidden) svg"
    );
    selection.call(zoom.transform, d3.zoomIdentity);
    setIsDirty(false);
  };

  const handleSvgClick = (event: React.MouseEvent<SVGElement>) => {
    if (hasSessionEnded) return;
    const target = event.target as HTMLElement;
    if (target.classList.contains("table")) {
      // the clicked element was a table
      const id = target.id;
      const tables = tableRef.current;
      if (tables.includes(id)) {
        target.removeAttribute("data-selected");
        setTables((tables) => tables.filter((t) => t !== id));
      } else {
        target.setAttribute("data-selected", "true");
        setTables((tables) => [...tables, id]);
      }
    }
  };

  const handleTableSave = async () => {
    const toRemove =
      session?.tables
        ?.filter((t) => !tables.find((ta) => ta === t.id))
        ?.map((t) => t.id) || [];
    const toAdd = tables.filter(
      (t) => !session?.tables?.find((ta) => ta.id === t)
    );
    await addSessionTables(sessionId, toAdd);
    const updated = await removeSessionTables(sessionId, toRemove);
    setSession(updated);
  };

  const zoom = d3.zoom().on("zoom", (e) => {
    d3.select("ion-router-outlet > .ion-page:not(.ion-page-hidden) svg g").attr(
      "transform",
      e.transform
    );
    setIsDirty(true);
  });

  const isPastSession =
    session?.start && new Date(session.start).getTime() < Date.now();
  const hasSessionEnded =
    session?.end && new Date(session.end).getTime() < Date.now();
  const formatStartDate =
    session?.start && new Date(session.start).toLocaleString();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Group session</IonTitle>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {session && (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  Information
                  <div className={"badge-container"}>
                    <IonBadge color={session?.active ? "primary" : "warning"}>
                      {session?.active
                        ? "active session"
                        : session?.pending
                        ? "planned session"
                        : "session ended"}
                    </IonBadge>
                  </div>
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                The{isPastSession ? "" : " planned"} session of group{" "}
                <a href={`/group/${session.group?.id}`}>
                  {session.group?.name}
                </a>{" "}
                {isPastSession ? "started" : "starts"} at {formatStartDate}
              </IonCardContent>
            </IonCard>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Tables of {session.mensa?.name}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {tables.length == 0 && (
                  <i>
                    The session does not{isPastSession ? "" : " yet"} have a
                    table assigned
                  </i>
                )}
                <section
                  ref={ref}
                  className={`svg-container ${
                    hasSessionEnded ? "readonly" : ""
                  }`}
                  dangerouslySetInnerHTML={{ __html: layout }}
                />
                {isDirty && (
                  <IonFab slot={"fixed"} horizontal={"end"} vertical={"bottom"}>
                    <IonFabButton size={"small"} onClick={resetZoomAndPan}>
                      <IonIcon icon={refresh} />
                    </IonFabButton>
                  </IonFab>
                )}
              </IonCardContent>
            </IonCard>
            {!hasSessionEnded && (
              <>
                <IonButton
                  onClick={handleTableSave}
                  style={{ width: "calc(100% - 20px)" }}
                  disabled={!areTablesDirty}
                >
                  Update session tables
                </IonButton>
                <IonButton
                  onClick={async () => {
                    await endSession(session.id as string);
                    setActiveSessions((sessions) =>
                      sessions.filter((sess) => sess.id != session.id)
                    );
                    setToastMessage("Successfully Ended Session!");
                    setIsToastOpen(true);
                  }}
                  style={{ width: "calc(100% - 20px)" }}
                  routerLink={"/home"}
                  color="danger"
                >
                  End Session
                </IonButton>
              </>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Session;

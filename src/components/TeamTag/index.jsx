import styles from './index.module.scss';

const TeamTag = ({ teams }) => {
    return (
        <div className={styles.teamTags}>
            {teams.slice(0, 3).map((team) => (
                <span key={team.id} className={`${styles.tag}`}>{`${team.name}`}</span>
            ))}
            {teams.length > 3 && <span className={styles.more}>{`+${teams.length - 3}`}</span>}
        </div>
    );
};

export default TeamTag;

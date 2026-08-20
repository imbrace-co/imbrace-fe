import styles from './index.module.scss';

const StatusTag = (props) => {
    const { isActive, text } = props;

    return (
        <div className={styles.statusTag}>
            <div className={`${styles.dot}${isActive ? ` ${styles.active}` : ''}`} />
            <span>{text}</span>
        </div>
    );
};

export default StatusTag;

import styles from './libraries.module.scss';
import { ProductCard } from './productCard';

const Libraries = ({ data, searchValue }: { data?: API.JourneyLibrary[]; searchValue?: string }) => {
    return (
        <div className={styles.container}>
            {data?.map((product) => {
                return <ProductCard key={`orgApp-${product._id}`} product={product} />;
            }) ?? null}
        </div>
    );
};

export default Libraries;

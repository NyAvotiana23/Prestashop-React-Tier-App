import React, {useEffect, useState} from 'react';
import {listCategories} from "../../service/category-service.js";
import Loading from "../../components/shared/Loading.jsx";
import {getLanguageText, getScalarValue} from "../../utils/util-functions.js";
import {patchStockAvailableForCategorieId} from "../../service/stock-service.js";

function RemoteStock(props) {
    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(false);

    const [rapport, setRapport] = useState(null)

    const [error, setError] = useState(null)
    async function handleValiderRemoteStock(e) {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.target);
        const {nombre, categorie} = Object.fromEntries(formData);

        if (nombre === "") {
            setError("Nombre invalide !");
            return;
        }
        console.log(nombre + " " + categorie);

        const rapport = await patchStockAvailableForCategorieId(nombre, categorie);

        console.log(rapport);


        setRapport(rapport);

    }

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const categoriesRes = await listCategories();
                console.log(categoriesRes);
                setCategories(categoriesRes);
            } catch (er) {
                console.log(er.message)
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return <Loading>Loading</Loading>
    }
    return (
        <div>
            {error && <p>
                Erreur : {error}

            </p>}

            <form onSubmit={handleValiderRemoteStock}>
                <label>Nombre : </label>
                <input type={"number"} name={"nombre"}/>
                <label>Categorie : </label>
                <select name={"categorie"}>
                    {categories.map((category) => <option
                        value={getScalarValue(category?.id)}>{getLanguageText(category?.name)}</option>)}
                </select>
                <button type={"submit"}>Valider</button>
            </form>
            {rapport && <div>

                <table>
                    <thead>
                        <tr>
                            <th>Total</th>
                            <th>Realise</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{rapport.total}</td>
                            <td>{rapport.realise}</td>
                        </tr>
                    </tbody>

                </table>
            </div>}
        </div>
    );
}

export default RemoteStock;
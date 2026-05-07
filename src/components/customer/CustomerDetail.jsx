import React from 'react';
import {useParams} from "react-router-dom";

function CustomerDetail(props) {
    const {customerId} = useParams();
    return (
        <div>
            <h2>Customer : {customerId}</h2>
        </div>
    );
}

export default CustomerDetail;
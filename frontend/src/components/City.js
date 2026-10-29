import React, { useEffect, useState } from 'react'
import Cityview from './Cityview';
import api, { errorMessage } from '../api';

export default function City() {

    const [city,setCity] = useState(null);

    const getcity = async ()=>{
        try {
            const response = await api.get('/city');
            setCity(response.data);
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    }

    
    const [searchName, setSearchName] = useState('');


    const addCity = async (name)=>{
        try {
            await api.post('/city/addcity', { name });
            setSearchName('');
            await getcity();
        } catch (error) {
            window.alert(errorMessage(error, 'Unable to add the city.'));
        }
    }

    useEffect(()=>{
        getcity();
    },[])

  return (
    <div>
        <div className='center'>
            <div className='container border rounded my-2'>
                <h1 style={{fontFamily:'Recursive'}}>Add a City</h1>
                <form className='container my-3' onSubmit={(e)=>{ e.preventDefault(); addCity(searchName); }}>
                    <div className="mb-3">
                    <label htmlFor="city">City</label>
                    <input type="text"   className="form-control" id="city" name='city' placeholder="Enter city" autoComplete="off"  value={searchName} onChange={(e) => setSearchName(e.target.value)}/>
                    </div>
                    <button type="submit" className="btn btn-primary">Add a City</button>
                </form>
            </div>
        </div>
        <div className='city-list'>            
        <h3 className='mx-3 my-2 d-flex justify-content-center align-items-center'>--- Cities ---</h3>
            {Array.isArray(city) && city.map((city,index) => {
                return <Cityview key={index} id={city._id} name={city.name}></Cityview>
            })}
        </div>
    </div>
  )
}
